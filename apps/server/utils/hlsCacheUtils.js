// Native modules
import fsPromises from "fs/promises";
import path from "path";

// Utils
import logger from "#utils/logger.js";

// ─── In-Memory Concurrency Locks ──────────────────────────────────────────────
// Key: "fileId:segmentIndex" → Promise (resolves when the segment is ready)
const segmentLocks = new Map();

// ─── Path Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the cache directory for all HLS segments of a specific file.
 */
function getCacheDir(baseStoragePath, fileId) {
  return path.join(baseStoragePath, "hls-cache", fileId);
}

/**
 * Returns the disk path for a specific segment file.
 */
function getSegmentPath(baseStoragePath, fileId, segmentIndex) {
  return path.join(getCacheDir(baseStoragePath, fileId), `seg-${segmentIndex}.ts`);
}

// ─── Cache Read / Write ───────────────────────────────────────────────────────

/**
 * Returns true if the segment file exists on disk.
 */
async function isSegmentCached(baseStoragePath, fileId, segmentIndex) {
  try {
    await fsPromises.access(getSegmentPath(baseStoragePath, fileId, segmentIndex));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a cached segment and returns its Buffer.
 */
function readSegment(baseStoragePath, fileId, segmentIndex) {
  const segPath = getSegmentPath(baseStoragePath, fileId, segmentIndex);
  return fsPromises.readFile(segPath);
}

/**
 * Writes a segment Buffer to disk, touching its atime for LRU tracking.
 */
async function writeSegment(baseStoragePath, fileId, segmentIndex, buffer) {
  const cacheDir = getCacheDir(baseStoragePath, fileId);
  await fsPromises.mkdir(cacheDir, { recursive: true });
  const segPath = getSegmentPath(baseStoragePath, fileId, segmentIndex);
  await fsPromises.writeFile(segPath, buffer);
  logger.debug(`[HLS Cache] Wrote seg-${segmentIndex}.ts for file ${fileId} (${buffer.length} bytes)`);
}

// ─── Cache Purge ──────────────────────────────────────────────────────────────

/**
 * Removes the entire HLS cache directory for a specific file.
 * Called when the source file is deleted or permanently purged.
 */
async function purgeFileCache(baseStoragePath, fileId) {
  const cacheDir = getCacheDir(baseStoragePath, fileId);
  try {
    await fsPromises.rm(cacheDir, { recursive: true, force: true });
    logger.info(`[HLS Cache] Purged cache for file ${fileId}`);
  } catch (err) {
    logger.warn(`[HLS Cache] Failed to purge cache for ${fileId}: ${err.message}`);
  }
}

// ─── TTL + LRU Cleanup ────────────────────────────────────────────────────────

/**
 * Scans the HLS cache directory and:
 * 1. Removes segments older than `ttlMs` (by last access time)
 * 2. Evicts least-recently-used segments if total size exceeds `maxSizeBytes`
 */
async function cleanupExpiredSegments(baseStoragePath, ttlMs, maxSizeBytes) {
  const hlsCacheDir = path.join(baseStoragePath, "hls-cache");

  // Nothing to do if cache dir doesn't exist yet
  try {
    await fsPromises.access(hlsCacheDir);
  } catch {
    return;
  }

  const now = Date.now();
  let totalSize = 0;
  const allSegments = []; // { path, atimeMs, sizeBytes }

  try {
    const fileDirs = await fsPromises.readdir(hlsCacheDir);

    for (const fileId of fileDirs) {
      const fileCacheDir = path.join(hlsCacheDir, fileId);

      try {
        const segments = await fsPromises.readdir(fileCacheDir);

        for (const seg of segments) {
          const segPath = path.join(fileCacheDir, seg);
          try {
            // Session playlist files (session-N.m3u8) are ephemeral: written per anchor
            // restart and never served. Always delete them so they cannot prevent the
            // directory-empty check from cleaning up the per-file cache dir.
            if (/^session-\d+\.m3u8$/.test(seg)) {
              await fsPromises.unlink(segPath).catch(() => {});
              logger.debug(`[HLS Cache] Evicted session playlist: ${segPath}`);
              continue;
            }

            const stats = await fsPromises.stat(segPath);
            const age = now - stats.atimeMs;

            // TTL eviction: remove segments not accessed within ttlMs
            if (age > ttlMs) {
              await fsPromises.unlink(segPath).catch(() => {});
              logger.debug(`[HLS Cache] TTL evicted: ${segPath}`);
            } else {
              totalSize += stats.size;
              allSegments.push({ path: segPath, atimeMs: stats.atimeMs, sizeBytes: stats.size });
            }
          } catch {
            // File may have been removed concurrently — skip
          }
        }

        // Remove empty file cache dirs
        const remaining = await fsPromises.readdir(fileCacheDir).catch(() => []);
        if (remaining.length === 0) {
          await fsPromises.rmdir(fileCacheDir).catch(() => {});
        }
      } catch {
        // Directory may have been removed concurrently — skip
      }
    }
  } catch (err) {
    logger.error(`[HLS Cache] Cleanup scan failed: ${err.message}`);
    return;
  }

  // LRU eviction: remove oldest-accessed segments until under maxSizeBytes
  if (maxSizeBytes && totalSize > maxSizeBytes) {
    logger.info(
      `[HLS Cache] Over size limit (${(totalSize / 1024 / 1024).toFixed(1)}MB / ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB), running LRU eviction`
    );

    // Sort ascending by access time (oldest first)
    allSegments.sort((a, b) => a.atimeMs - b.atimeMs);

    for (const seg of allSegments) {
      if (totalSize <= maxSizeBytes) {
        break;
      }
      await fsPromises.unlink(seg.path).catch(() => {});
      totalSize -= seg.sizeBytes;
    }

    logger.info(`[HLS Cache] After LRU eviction: ~${(totalSize / 1024 / 1024).toFixed(1)}MB remaining`);
  }
}

/**
 * Returns the disk path for the HLS playlist file for a specific file.
 */
function getPlaylistPath(baseStoragePath, fileId) {
  return path.join(getCacheDir(baseStoragePath, fileId), "playlist.m3u8");
}

/**
 * Returns true if the HLS playlist file exists on disk (full transcode is done).
 */
async function isPlaylistCached(baseStoragePath, fileId) {
  try {
    await fsPromises.access(getPlaylistPath(baseStoragePath, fileId));
    return true;
  } catch {
    return false;
  }
}

// ─── Concurrency Lock ─────────────────────────────────────────────────────────

/**
 * Executes `fn` exclusively for a given segment.
 *
 * If another request is already building the same segment, this call waits for
 * it to finish (segment will be in cache) and then returns without calling `fn`.
 *
 * @param {string} fileId
 * @param {number} segmentIndex
 * @param {() => Promise<void>} fn  - async function that generates & writes the segment
 */
async function withSegmentLock(fileId, segmentIndex, fn) {
  const key = `${fileId}:${segmentIndex}`;

  if (segmentLocks.has(key)) {
    // Another request is already building this segment — wait for it to finish
    await segmentLocks.get(key);
    return;
  }

  let resolve;
  const lockPromise = new Promise((r) => {
    resolve = r;
  });
  segmentLocks.set(key, lockPromise);

  try {
    await fn();
  } finally {
    segmentLocks.delete(key);
    resolve();
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const HlsCacheUtils = {
  getCacheDir,
  getSegmentPath,
  getPlaylistPath,
  isSegmentCached,
  isPlaylistCached,
  readSegment,
  writeSegment,
  purgeFileCache,
  cleanupExpiredSegments,
  withSegmentLock,
};

export default HlsCacheUtils;
