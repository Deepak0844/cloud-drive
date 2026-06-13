/**
 * hlsSessionUtils.js
 *
 * Session-based segmented HLS transcoding (see work/plans/2026-06-11-robust-hls-streaming.md).
 *
 * A "session" is one ffmpeg child encoding linearly from a seek anchor, writing
 * seg-<anchor>.ts, seg-<anchor+1>.ts, ... into the file's HLS cache dir. A seek that
 * lands outside the session's progress window restarts the session at the new anchor
 * (reusing the same concurrency slot) rather than waiting for a single whole-file pass.
 *
 * Responsibilities:
 *   - One live session per fileId (registry).
 *   - Global concurrency cap on live ffmpeg sessions (semaphore).
 *   - Bounded, fast-rejecting waits for a requested segment.
 *   - Idle-session reaping and kill-on-purge.
 */

// Native modules
import { spawn } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";

// Core helpers
import { resolvedFfmpegPath } from "#utils/mediaCore.js";

// Utils
import HlsCacheUtils from "#utils/hlsCacheUtils.js";
import MediaUtils from "#utils/mediaUtils.js";
import logger from "#utils/logger.js";
import { HlsConfig } from "#constants/generalConstants.js";

// ─── State ──────────────────────────────────────────────────────────────────────

// fileId → session object
const sessions = new Map();

// fileId → tail Promise of a per-file mutex chain. Serializes session create/restart so
// concurrent requests for the same file (e.g. hls.js prefetching seg-0 + seg-1) cannot each
// spawn a duplicate session writing overlapping segments into the same cache dir.
const fileLockTails = new Map();

// Counting semaphore for live ffmpeg sessions
let availableSlots = HlsConfig.MAX_CONCURRENT_TRANSCODE_SESSIONS;
const slotWaiters = []; // FIFO of grant callbacks awaiting a free slot

// ─── Semaphore ──────────────────────────────────────────────────────────────────

/**
 * Acquires a transcode slot, waiting up to `timeoutMs` if none is free.
 * @returns {Promise<boolean>} true if a slot was acquired, false on timeout.
 */
function acquireSlot(timeoutMs) {
  if (availableSlots > 0) {
    availableSlots -= 1;
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      const idx = slotWaiters.indexOf(grant);
      if (idx >= 0) {
        slotWaiters.splice(idx, 1);
      }
      resolve(false);
    }, timeoutMs);

    // Called by releaseSlot to hand this waiter the freed slot (kept "taken", not returned to pool)
    const grant = () => {
      if (settled) {
        return false;
      }
      settled = true;
      clearTimeout(timer);
      resolve(true);
      return true;
    };

    slotWaiters.push(grant);
  });
}

/**
 * Releases a transcode slot, handing it to the next live waiter if any.
 */
function releaseSlot() {
  while (slotWaiters.length > 0) {
    const grant = slotWaiters.shift();
    if (grant()) {
      return; // slot handed off — stays taken by the new holder
    }
  }
  availableSlots += 1;
}

// ─── Per-File Lock ────────────────────────────────────────────────────────────────

/**
 * A simple per-file async mutex. Returns `{ acquired, release }`: await `acquired` to take
 * the lock, then call `release()` exactly once when done. Serializes the session
 * create/restart decision so concurrent requests for one file can't race into duplicates.
 */
function acquireFileLock(fileId) {
  const prev = fileLockTails.get(fileId) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const tail = prev.then(() => gate);
  fileLockTails.set(fileId, tail);

  return {
    acquired: prev,
    release: () => {
      release();
      // Drop the map entry if no later waiter chained onto this tail (avoids unbounded growth)
      if (fileLockTails.get(fileId) === tail) {
        fileLockTails.delete(fileId);
      }
    },
  };
}

// ─── Session Lifecycle ────────────────────────────────────────────────────────────

/**
 * Spawns an ffmpeg session anchored at `anchorSegment`. The session is assumed to
 * already hold a concurrency slot (the caller acquires it, or it is transferred from
 * a superseded session). The session owns `sourcePath` and unlinks it when it ends.
 */
function startSession(baseStoragePath, fileId, anchorSegment, sourcePath, isAudioOnly) {
  const cacheDir = HlsCacheUtils.getCacheDir(baseStoragePath, fileId);
  // ffmpeg writes seg-*.ts here; the dir must exist before it spawns
  fs.mkdirSync(cacheDir, { recursive: true });

  const args = MediaUtils.buildHlsSessionArgs({
    sourcePath,
    cacheDir,
    anchorSegment,
    segmentDuration: HlsConfig.SEGMENT_DURATION,
    isAudioOnly,
  });

  logger.info(`[HLS Session] Starting session for ${fileId} anchored at seg-${anchorSegment}`);
  const proc = spawn(resolvedFfmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });

  const session = {
    proc,
    anchorSegment,
    highestWritten: anchorSegment - 1, // nothing written yet
    sourcePath,
    isAudioOnly,
    startedAt: Date.now(),
    lastAccessAt: Date.now(),
    superseded: false, // true when a restart reuses this session's slot
    diedWaiters: new Set(), // resolve callbacks woken when the process exits
    pollTimer: null,
  };
  sessions.set(fileId, session);

  // Track progress: advance highestWritten as segments appear on disk
  session.pollTimer = setInterval(async () => {
    while (true) {
      const next = session.highestWritten + 1;
      const ready = await HlsCacheUtils.isSegmentCached(baseStoragePath, fileId, next).catch(() => false);
      if (!ready) { break; }
      session.highestWritten = next;
    }
  }, HlsConfig.SEGMENT_POLL_MS);

  let stderrTail = "";
  proc.stderr.on("data", (chunk) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-1000);
  });

  const cleanup = (reason) => {
    if (session.pollTimer) {
      clearInterval(session.pollTimer);
      session.pollTimer = null;
    }
    // Only drop the registry entry if it still points at this session (a restart may have replaced it)
    if (sessions.get(fileId) === session) {
      sessions.delete(fileId);
    }
    fsPromises.unlink(sourcePath).catch(() => {});
    // A superseded session's slot was transferred to its successor — do not return it to the pool
    if (!session.superseded) {
      releaseSlot();
    }
    // Wake any segment waiters so they fast-reject (session-died) instead of waiting the full budget
    for (const wake of session.diedWaiters) {
      wake();
    }
    session.diedWaiters.clear();
    logger.info(`[HLS Session] Session ended for ${fileId} (${reason})`);
  };

  proc.on("close", (code) => {
    if (code !== 0 && code !== null) {
      logger.error(`[HLS Session] ffmpeg exited ${code} for ${fileId}:\n${stderrTail}`);
    }
    cleanup(`close code=${code}`);
  });

  proc.on("error", (err) => {
    logger.error(`[HLS Session] ffmpeg spawn error for ${fileId}: ${err.message}`);
    cleanup(`error ${err.message}`);
  });

  return session;
}

/**
 * Waits up to SEGMENT_WAIT_MS for `segmentIndex` to appear, fast-rejecting if the
 * session producing it dies first.
 *
 * @returns {Promise<{ready: boolean, reason?: string}>}
 */
function waitForSegment(baseStoragePath, fileId, segmentIndex, session) {
  return new Promise((resolve) => {
    let done = false;

    const finish = (result) => {
      if (done) {
        return;
      }
      done = true;
      clearInterval(poll);
      clearTimeout(timer);
      session.diedWaiters.delete(onDied);
      resolve(result);
    };

    // A session ends either because it errored OR because it finished encoding (all segments,
    // including this one, are now on disk). Re-check the cache before concluding failure so a
    // clean completion is reported as ready, not a spurious "session-died".
    const onDied = async () => {
      if (done) {
        return;
      }
      const ready = await HlsCacheUtils.isSegmentCached(baseStoragePath, fileId, segmentIndex).catch(() => false);
      finish(ready ? { ready: true } : { ready: false, reason: "session-died" });
    };
    session.diedWaiters.add(onDied);

    const poll = setInterval(async () => {
      session.lastAccessAt = Date.now(); // heartbeat: keep the idle reaper from killing an active waiter
      const ready = await HlsCacheUtils.isSegmentCached(baseStoragePath, fileId, segmentIndex).catch(() => false);
      if (ready) {
        finish({ ready: true });
      }
    }, HlsConfig.SEGMENT_POLL_MS);

    const timer = setTimeout(() => finish({ ready: false, reason: "timeout" }), HlsConfig.SEGMENT_WAIT_MS);
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Ensures `segmentIndex` for `fileId` exists, starting or restarting a transcode
 * session as needed, then waiting (bounded) for it.
 *
 * `getSource` is an async callback returning a freshly decrypted, seekable temp path.
 * It is invoked ONLY when a new session must start — cache hits and progressing-session
 * waits never decrypt.
 *
 * @param {string}   baseStoragePath
 * @param {string}   fileId
 * @param {number}   segmentIndex
 * @param {() => Promise<string>} getSource
 * @param {boolean}  isAudioOnly
 * @returns {Promise<{ready: boolean, reason?: string}>}
 */
async function ensureSegment(baseStoragePath, fileId, segmentIndex, getSource, isAudioOnly) {
  const isCached = () => HlsCacheUtils.isSegmentCached(baseStoragePath, fileId, segmentIndex).catch(() => false);

  // 1. Fast path: already cached
  if (await isCached()) {
    const existing = sessions.get(fileId);
    if (existing) {
      existing.lastAccessAt = Date.now();
    }
    return { ready: true };
  }

  const isProgressingToward = (s) =>
    s.anchorSegment <= segmentIndex && segmentIndex <= s.highestWritten + HlsConfig.LOOKAHEAD_SEGMENTS;

  // 2. Decide + (re)start under a per-file lock so concurrent requests for the same file
  //    don't spawn duplicate sessions. The slow decrypt (getSource) happens inside the lock,
  //    so a second request waits for the session to exist, then takes the wait path below.
  const lock = acquireFileLock(fileId);
  await lock.acquired;

  let session;
  try {
    // A previous lock holder may have produced the segment or started the session meanwhile
    if (await isCached()) {
      const existing = sessions.get(fileId);
      if (existing) {
        existing.lastAccessAt = Date.now();
      }
      return { ready: true };
    }

    session = sessions.get(fileId);

    if (session && isProgressingToward(session)) {
      // The live session will reach this segment soon — just wait for it
      session.lastAccessAt = Date.now();
    } else if (session) {
      // Seek outside the window (backward, or far ahead): restart, transferring the slot
      const oldSession = session;
      oldSession.superseded = true;
      try {
        oldSession.proc.kill("SIGTERM");
      } catch {
        // process may already be gone — its close handler handles cleanup
      }
      // Wait for the dying process to fully exit before starting the replacement.
      // Both sessions share the same cacheDir + seg-%d.ts atomic-rename pattern; the
      // dying ffmpeg could otherwise overwrite segments the new session has already produced.
      await new Promise((resolve) => {
        if (oldSession.proc.exitCode !== null) {
          resolve();
        } else {
          oldSession.proc.once("close", resolve);
        }
      });
      let source;
      try {
        source = await getSource();
      } catch (err) {
        // We took implicit ownership of the concurrency slot from the superseded session.
        // Since we cannot start a replacement, return the slot so the pool is not drained.
        oldSession.superseded = false; // allow cleanup() to releaseSlot() normally
        throw err;
      }
      session = startSession(baseStoragePath, fileId, segmentIndex, source, isAudioOnly);
    } else {
      // No session: acquire a slot then start one
      const gotSlot = await acquireSlot(HlsConfig.SEGMENT_WAIT_MS);
      if (!gotSlot) {
        return { ready: false, reason: "no-slot" };
      }
      let source;
      try {
        source = await getSource();
      } catch (err) {
        releaseSlot();
        throw err;
      }
      session = startSession(baseStoragePath, fileId, segmentIndex, source, isAudioOnly);
    }
  } finally {
    lock.release();
  }

  // 3. Bounded wait for the segment (outside the lock — does not block other requests)
  return waitForSegment(baseStoragePath, fileId, segmentIndex, session);
}

/**
 * Kills the running session for a file (if any). Idempotent. The process close
 * handler performs slot release, temp-file unlink, and registry removal.
 */
function killSession(fileId) {
  const session = sessions.get(fileId);
  if (!session) {
    return;
  }
  logger.info(`[HLS Session] Killing session for ${fileId}`);
  try {
    session.proc.kill("SIGKILL");
  } catch {
    // already gone — close handler will (or did) clean up
  }
}

/** Number of live sessions — exposed for tests and diagnostics. */
function getActiveSessionCount() {
  return sessions.size;
}

// ─── Idle Reaper ──────────────────────────────────────────────────────────────────

let reaperTimer = setInterval(() => {
  const now = Date.now();
  for (const [fileId, session] of sessions) {
    if (now - session.lastAccessAt > HlsConfig.SESSION_IDLE_TIMEOUT_MS) {
      logger.info(`[HLS Session] Reaping idle session for ${fileId}`);
      try {
        session.proc.kill("SIGTERM");
      } catch {
        // already gone
      }
    }
  }
}, HlsConfig.SESSION_REAP_INTERVAL_MS);
// Do not keep the event loop alive solely for the reaper
if (typeof reaperTimer.unref === "function") {
  reaperTimer.unref();
}

/** Stops the idle reaper — call from test teardown to avoid open-handle leaks. */
function stopReaper() {
  if (reaperTimer) {
    clearInterval(reaperTimer);
    reaperTimer = null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────────

const HlsSessionUtils = {
  ensureSegment,
  killSession,
  getActiveSessionCount,
  stopReaper,
};

export default HlsSessionUtils;
