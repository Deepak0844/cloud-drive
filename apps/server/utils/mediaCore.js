/**
 * mediaCore.js
 *
 * Shared internals for all media-processing utilities:
 *   - ffmpeg / ffprobe path resolution
 *   - Format registries (image, audio, video)
 *   - Low-level helpers used by both thumbnailUtils and mediaUtils
 */

// Native modules
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// Third-party modules
import { path as installerFfmpegPath } from "@ffmpeg-installer/ffmpeg";
import { path as installerFfprobePath } from "@ffprobe-installer/ffprobe";

// Utils
import logger from "#utils/logger.js";
import CryptoUtils from "#utils/cryptoUtils.js";

// ─── ffmpeg / ffprobe paths ────────────────────────────────────────────────────
// Prefer system binaries over npm-bundled ones (better codec support, e.g. Vorbis in MKV)

const systemFfmpeg = fs.existsSync("/usr/bin/ffmpeg") ? "/usr/bin/ffmpeg" : null;
const systemFfprobe = fs.existsSync("/usr/bin/ffprobe") ? "/usr/bin/ffprobe" : null;

export const resolvedFfmpegPath = systemFfmpeg || installerFfmpegPath;
export const resolvedFfprobePath = systemFfprobe || installerFfprobePath;

logger.info(`[Media] Using ffmpeg: ${resolvedFfmpegPath}`);
logger.info(`[Media] Using ffprobe: ${resolvedFfprobePath}`);

// ─── Format Registries ─────────────────────────────────────────────────────────

/** Image formats natively supported by sharp (no pre-processing needed) */
export const SHARP_NATIVE_FORMATS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".tiff",
  ".tif",
  ".bmp",
  ".svg",
]);

/** RAW camera formats — need ffmpeg to extract a JPEG first */
export const RAW_IMAGE_FORMATS = new Set([
  ".cr2",
  ".cr3",
  ".nef",
  ".nrw",
  ".arw",
  ".srf",
  ".sr2",
  ".dng",
  ".orf",
  ".rw2",
  ".pef",
  ".raf",
  ".x3f",
  ".3fr",
]);

/** HEIC/HEIF formats — need heic-convert pre-processing */
export const HEIC_FORMATS = new Set([".heic", ".heif"]);

/** Video formats that browsers can play natively (no MP4 preview needed) */
export const BROWSER_NATIVE_VIDEO_FORMATS = new Set([".mp4", ".m4v", ".webm"]);

/** Audio MIME types that all modern browsers can play natively (no HLS needed) */
export const BROWSER_NATIVE_AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/opus",
  "audio/webm",
  "audio/flac",
]);

/** Audio formats supported by music-metadata for album art extraction */
export const AUDIO_FORMATS_WITH_ART = new Set([
  ".mp3",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wav",
  ".aiff",
  ".aif",
  ".wma",
  ".ape",
  ".wv",
]);

// ─── Shared Helpers ────────────────────────────────────────────────────────────

/** Creates a directory if it does not exist */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Decrypts a file to a temp location for external processing (ffmpeg/sharp).
 * Caller must unlink the returned path when done.
 */
export async function decryptToTemp(sourcePath, userKey, iv) {
  const origExt = path.extname(path.basename(sourcePath));
  const tempPath = path.join(os.tmpdir(), `cloud-drive-decrypt-${Date.now()}${origExt || ".tmp"}`);
  const decipher = CryptoUtils.getDecipherStream(userKey, iv);

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(sourcePath);
    const writeStream = fs.createWriteStream(tempPath);
    readStream
      .pipe(decipher)
      .pipe(writeStream)
      .on("finish", resolve)
      .on("error", (err) => {
        logger.error(`[Crypto] Decrypt to temp failed: ${err.message}`);
        reject(err);
      });
    readStream.on("error", reject);
    decipher.on("error", reject);
  });

  return tempPath;
}

/** Promise wrapper for ffprobe metadata */
export function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      resolvedFfprobePath,
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`ffprobe failed for ${filePath}: ${err.message}\n${stderr}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseErr) {
          reject(new Error(`ffprobe JSON parse failed for ${filePath}: ${parseErr.message}`));
        }
      }
    );
  });
}

/** Check if a video file has a video stream */
export async function hasVideoStream(filePath) {
  try {
    const data = await probeVideo(filePath);
    return data.streams.some((s) => s.codec_type === "video");
  } catch {
    return false;
  }
}

/** Get video duration in seconds using ffprobe */
export async function getVideoDuration(filePath) {
  try {
    const data = await probeVideo(filePath);
    return parseFloat(data.format.duration) || 0;
  } catch {
    return 0;
  }
}

export default {
  resolvedFfmpegPath,
  resolvedFfprobePath,
  SHARP_NATIVE_FORMATS,
  RAW_IMAGE_FORMATS,
  HEIC_FORMATS,
  BROWSER_NATIVE_VIDEO_FORMATS,
  BROWSER_NATIVE_AUDIO_MIMES,
  AUDIO_FORMATS_WITH_ART,
  ensureDirectoryExists,
  decryptToTemp,
  probeVideo,
  hasVideoStream,
  getVideoDuration,
};
