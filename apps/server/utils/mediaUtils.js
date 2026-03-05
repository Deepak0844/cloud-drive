// Native modules
import { execFile } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

// Third-party modules
import archiver from "archiver";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import heicConvert from "heic-convert";
import sharp from "sharp";

// Utils
import logger from "./logger.js";

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// ─── Format Registries ────────────────────────────────────────────────────────

/**
 * Image formats natively supported by sharp (no pre-processing needed)
 */
const SHARP_NATIVE_FORMATS = new Set([
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

/**
 * RAW camera formats — need ffmpeg to extract a JPEG first
 */
const RAW_IMAGE_FORMATS = new Set([
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

/**
 * HEIC/HEIF formats — need heic-convert pre-processing
 */
const HEIC_FORMATS = new Set([".heic", ".heif"]);

/**
 * Video formats that browsers can play natively (no MP4 preview needed)
 */
const BROWSER_NATIVE_VIDEO_FORMATS = new Set([".mp4", ".m4v", ".webm"]);

/**
 * Audio formats supported by music-metadata for album art extraction
 */
const AUDIO_FORMATS_WITH_ART = new Set([
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

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Creates a directory if it does not exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Promise wrapper for ffprobe metadata
 */
function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Check if a video file has a video stream
 */
async function hasVideoStream(filePath) {
  try {
    const data = await probeVideo(filePath);
    return data.streams.some((s) => s.codec_type === "video");
  } catch {
    return false;
  }
}

/**
 * Get video duration in seconds using ffprobe
 */
async function getVideoDuration(filePath) {
  try {
    const data = await probeVideo(filePath);
    return parseFloat(data.format.duration) || 0;
  } catch {
    return 0;
  }
}

// ─── Image Thumbnails ─────────────────────────────────────────────────────────

/**
 * Extract a JPEG from a RAW camera file using ffmpeg
 */
function extractRawImageFrame(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .outputOptions(["-vframes 1", "-q:v 2"])
      .on("end", () => resolve(destPath))
      .on("error", (err) => reject(new Error(`RAW extraction failed: ${err.message}`)))
      .save(destPath);
  });
}

/**
 * Generates a thumbnail for any image format
 * Supports: JPEG, PNG, GIF, WebP, AVIF, TIFF, BMP, SVG, HEIC/HEIF, RAW (CR2, NEF, ARW, DNG, etc.)
 *
 * @param {string} sourcePath - Path to the source image
 * @param {string} destPath - Path to save the thumbnail
 * @returns {Promise<string>} - Path to the generated thumbnail
 */
async function generateImageThumbnail(sourcePath, destPath) {
  const destDir = path.dirname(destPath);
  ensureDirectoryExists(destDir);

  const ext = path.extname(sourcePath).toLowerCase();

  try {
    // ── HEIC/HEIF: convert to JPEG buffer first ──
    if (HEIC_FORMATS.has(ext)) {
      logger.debug(`[Thumbnail] HEIC/HEIF detected: ${sourcePath}`);
      const inputBuffer = await fsPromises.readFile(sourcePath);
      const jpegBuffer = await heicConvert({ buffer: inputBuffer, format: "JPEG", quality: 0.85 });
      await sharp(jpegBuffer)
        .resize(300, 300, { fit: "cover", withoutEnlargement: false })
        .toFormat("jpeg", { quality: 85 })
        .toFile(destPath);
      logger.info(`[Thumbnail] HEIC thumbnail generated: ${destPath}`);
      return destPath;
    }

    // ── RAW camera formats: extract via ffmpeg then thumbnail ──
    if (RAW_IMAGE_FORMATS.has(ext)) {
      logger.debug(`[Thumbnail] RAW format detected (${ext}): ${sourcePath}`);
      const tempJpeg = destPath.replace(".jpg", "_raw_temp.jpg");
      try {
        await extractRawImageFrame(sourcePath, tempJpeg);
        await sharp(tempJpeg)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        fs.unlinkSync(tempJpeg);
        logger.info(`[Thumbnail] RAW thumbnail generated: ${destPath}`);
        return destPath;
      } catch (rawErr) {
        logger.warn(`[Thumbnail] RAW extraction failed, skipping: ${rawErr.message}`);
        if (fs.existsSync(tempJpeg)) {
          fs.unlinkSync(tempJpeg);
        }
        throw rawErr;
      }
    }

    // ── SVG: rasterize with explicit density ──
    if (ext === ".svg") {
      logger.debug(`[Thumbnail] SVG detected: ${sourcePath}`);
      await sharp(sourcePath, { density: 150 })
        .resize(300, 300, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toFormat("jpeg", { quality: 85 })
        .toFile(destPath);
      logger.info(`[Thumbnail] SVG thumbnail generated: ${destPath}`);
      return destPath;
    }

    // ── AVIF: sharp → sips (macOS) → ffmpeg fallback chain ──
    if (ext === ".avif") {
      logger.debug(`[Thumbnail] AVIF detected: ${sourcePath}`);

      // Attempt 1: sharp (works for 8-bit AVIF)
      try {
        await sharp(sourcePath)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        logger.info(`[Thumbnail] AVIF thumbnail generated via sharp: ${destPath}`);
        return destPath;
      } catch (sharpErr) {
        logger.warn(`[Thumbnail] AVIF sharp failed (${sharpErr.message}), trying sips fallback`);
      }

      // Attempt 2: macOS sips (handles 10/12-bit AVIF that sharp can't decode)
      const sipsTempJpeg = destPath.replace(".jpg", "_sips_temp.jpg");
      try {
        await new Promise((resolve, reject) => {
          execFile(
            "sips",
            ["-s", "format", "jpeg", "-s", "formatOptions", "85", "-Z", "300", sourcePath, "--out", sipsTempJpeg],
            { timeout: 15000 },
            (err) => (err ? reject(err) : resolve())
          );
        });
        // sips doesn't do cover-crop, so re-process through sharp for exact 300×300
        await sharp(sipsTempJpeg)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        fs.unlinkSync(sipsTempJpeg);
        logger.info(`[Thumbnail] AVIF thumbnail generated via sips fallback: ${destPath}`);
        return destPath;
      } catch (sipsErr) {
        if (fs.existsSync(sipsTempJpeg)) fs.unlinkSync(sipsTempJpeg);
        logger.warn(`[Thumbnail] AVIF sips fallback failed (${sipsErr.message}), trying ffmpeg`);
      }

      // Attempt 3: ffmpeg (last resort)
      const ffmpegTempJpeg = destPath.replace(".jpg", "_avif_temp.jpg");
      try {
        await extractRawImageFrame(sourcePath, ffmpegTempJpeg);
        await sharp(ffmpegTempJpeg)
          .resize(300, 300, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: 85 })
          .toFile(destPath);
        fs.unlinkSync(ffmpegTempJpeg);
        logger.info(`[Thumbnail] AVIF thumbnail generated via ffmpeg fallback: ${destPath}`);
        return destPath;
      } catch (fallbackErr) {
        logger.error(`[Thumbnail] AVIF all fallbacks failed: ${fallbackErr.message}`);
        if (fs.existsSync(ffmpegTempJpeg)) fs.unlinkSync(ffmpegTempJpeg);
        throw fallbackErr;
      }
    }

    // ── All other sharp-native formats (JPEG, PNG, WebP, TIFF, BMP, GIF) ──
    if (SHARP_NATIVE_FORMATS.has(ext) || ext === "") {
      await sharp(sourcePath)
        .resize(300, 300, { fit: "cover", withoutEnlargement: false })
        .toFormat("jpeg", { quality: 85 })
        .toFile(destPath);
      logger.info(`[Thumbnail] Image thumbnail generated (${ext || "unknown"}): ${destPath}`);
      return destPath;
    }

    // ── Unknown format: attempt sharp anyway ──
    logger.warn(`[Thumbnail] Unknown image format (${ext}), attempting sharp fallback`);
    await sharp(sourcePath).resize(300, 300, { fit: "cover" }).toFormat("jpeg", { quality: 85 }).toFile(destPath);
    return destPath;
  } catch (error) {
    logger.error(`[Thumbnail] Image thumbnail failed for ${sourcePath}: ${error.message}`);
    throw error;
  }
}

// ─── Video Thumbnails ─────────────────────────────────────────────────────────

/**
 * Run a single ffmpeg thumbnail attempt
 */
function runVideoThumbnailAttempt(sourcePath, destPath, seekSeconds, withScale) {
  return new Promise((resolve, reject) => {
    const outputOptions = ["-vframes 1", "-q:v 2"];
    if (withScale) {
      outputOptions.push("-vf scale=300:300:force_original_aspect_ratio=increase,crop=300:300");
    }

    const cmd = ffmpeg(sourcePath);
    if (seekSeconds > 0) {
      cmd.inputOptions([`-ss ${seekSeconds}`]);
    }

    cmd
      .outputOptions(outputOptions)
      .on("end", () => resolve(destPath))
      .on("error", (err) => reject(err))
      .save(destPath);
  });
}

/**
 * Generates a thumbnail for any video format with duration-aware seeking and fallback chain.
 * Supports: MP4, MKV, AVI, MOV, WMV, FLV, TS, WebM, M4V, 3GP, OGV, and more.
 *
 * @param {string} sourcePath - Path to the source video
 * @param {string} destFolder - Folder to save the thumbnail
 * @param {string} filename - Thumbnail filename
 * @returns {Promise<string>} - Path to the generated thumbnail
 */
async function generateVideoThumbnail(sourcePath, destFolder, filename) {
  ensureDirectoryExists(destFolder);
  const destPath = path.join(destFolder, filename);

  logger.debug(`[Thumbnail] Generating video thumbnail: ${sourcePath}`);

  // Check for video stream first
  const videoStreamExists = await hasVideoStream(sourcePath);
  if (!videoStreamExists) {
    logger.warn(`[Thumbnail] No video stream found in: ${sourcePath}`);
    throw new Error("No video stream found in file");
  }

  // Duration-aware seek: 10% of video length, capped between 0.5s and 30s
  const duration = await getVideoDuration(sourcePath);
  const seekTime = duration > 0 ? Math.min(Math.max(duration * 0.1, 0.5), 30) : 0.5;
  logger.debug(`[Thumbnail] Video duration: ${duration}s, seeking to: ${seekTime}s`);

  // Attempt chain: seek+scale → seek only → start+scale → start only
  const attempts = [
    { seek: seekTime, scale: true, label: `seek ${seekTime.toFixed(1)}s + scale` },
    { seek: seekTime, scale: false, label: `seek ${seekTime.toFixed(1)}s no scale` },
    { seek: 0, scale: true, label: "start + scale" },
    { seek: 0, scale: false, label: "start no scale" },
  ];

  for (const attempt of attempts) {
    try {
      await runVideoThumbnailAttempt(sourcePath, destPath, attempt.seek, attempt.scale);
      logger.info(`[Thumbnail] Video thumbnail generated (${attempt.label}): ${destPath}`);
      return destPath;
    } catch (err) {
      logger.warn(`[Thumbnail] Attempt failed (${attempt.label}): ${err.message}`);
    }
  }

  throw new Error(`Video thumbnail generation failed for: ${sourcePath}`);
}

// ─── On-the-fly Pipe Transcode ────────────────────────────────────────────────

/**
 * On-the-fly transcode: pipes ffmpeg output directly to an HTTP response.
 * Zero disk usage — converted bytes flow from ffmpeg → memory → client.
 *
 * Uses fragmented MP4 (frag_keyframe + empty_moov) so the browser can start
 * playback immediately without needing the full file written first.
 *
 * @param {string} sourcePath - Path to the source video file
 * @param {import('express').Response} res - Express response to pipe into
 * @returns {Promise<void>}
 */
function pipeTranscode(sourcePath, res) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(sourcePath)
      .outputOptions([
        "-c:v libx264",
        "-crf 23",
        "-preset fast",
        "-c:a aac",
        "-b:a 128k",
        "-pix_fmt yuv420p",
        "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2",
        // Fragmented MP4 — enables streaming without seek/faststart
        "-movflags frag_keyframe+empty_moov+default_base_moof",
      ])
      .toFormat("mp4")
      .on("start", (cmd) => logger.debug("[FFMPEG] Pipe transcode:", cmd))
      .on("end", () => {
        logger.info("[FFMPEG] Pipe transcode complete for:", sourcePath);
        resolve();
      })
      .on("error", (err) => {
        // "Output stream closed" is expected when the client disconnects mid-stream
        if (err.message && err.message.includes("Output stream closed")) {
          logger.debug("[FFMPEG] Client disconnected during pipe transcode");
          resolve();
        } else {
          logger.error("[FFMPEG] Pipe transcode error:", err.message);
          reject(err);
        }
      });

    // Pipe ffmpeg output directly to the HTTP response
    command.pipe(res, { end: true });
  });
}

/**
 * Determines if a video file needs transcoding (i.e., not browser-native)
 */
function needsVideoPreview(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  if (!BROWSER_NATIVE_VIDEO_FORMATS.has(ext)) {
    return true;
  }
  if (mimeType === "video/quicktime") {
    return true;
  }
  return false;
}

/**
 * Generates a waveform image from an audio file.
 */
function generateAudioWaveform(sourcePath, destPath) {
  ensureDirectoryExists(path.dirname(destPath));

  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .complexFilter(["showwavespic=s=800x200:colors=0088FF"])
      .outputOptions(["-frames:v 1"])
      .on("start", (cmd) => logger.debug("[FFMPEG] Waveform command:", cmd))
      .on("end", () => {
        logger.info("[FFMPEG] Waveform generated:", destPath);
        resolve(destPath);
      })
      .on("error", (err) => {
        logger.error("[FFMPEG] Waveform error:", err.message);
        reject(err);
      })
      .save(destPath);
  });
}

// ─── Audio Album Art ──────────────────────────────────────────────────────────

/**
 * Extracts album art from an audio file and saves it as a JPEG.
 * Falls back to generating a waveform image if no album art is found.
 */
async function extractAudioAlbumArt(sourcePath, destPath) {
  const destDir = path.dirname(destPath);
  ensureDirectoryExists(destDir);

  // Step 1: Try to extract embedded album art
  try {
    const { parseFile } = await import("music-metadata");
    const metadata = await parseFile(sourcePath);

    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      await sharp(picture.data).resize(300, 300, { fit: "cover" }).toFormat("jpeg", { quality: 85 }).toFile(destPath);
      logger.info("[Thumbnail] Audio album art extracted:", destPath);
      return destPath;
    }
  } catch (err) {
    logger.warn(`[Thumbnail] Album art extraction failed for ${sourcePath}: ${err.message}`);
  }

  // Step 2: Fallback — generate a waveform image
  try {
    await generateAudioWaveform(sourcePath, destPath);
    return destPath;
  } catch (waveErr) {
    logger.warn(`[Thumbnail] Waveform fallback also failed for ${sourcePath}: ${waveErr.message}`);
  }

  return null;
}

// ─── ZIP Streaming ────────────────────────────────────────────────────────────

/**
 * Creates a ZIP archive from a list of files and folders and streams it to an output stream.
 */
function createZipStream(items, outputStream) {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("error", (err) => {
      logger.error("[ZIP] Archiver error:", err.message);
      reject(err);
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        logger.warn("[ZIP] Archiver warning:", err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(outputStream);

    for (const item of items) {
      if (item.type === "file") {
        if (fs.existsSync(item.path)) {
          archive.file(item.path, { name: item.name });
        } else {
          logger.warn(`[ZIP] File not found, skipping: ${item.path}`);
        }
      } else if (item.type === "folder") {
        if (fs.existsSync(item.path)) {
          archive.directory(item.path, item.name);
        } else {
          logger.warn(`[ZIP] Folder not found, skipping: ${item.path}`);
        }
      }
    }

    archive.on("end", () => {
      logger.info(`[ZIP] Finished bundling ${items.length} items`);
      resolve();
    });

    archive.finalize();
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const MediaUtils = {
  generateImageThumbnail,
  generateVideoThumbnail,
  pipeTranscode,
  extractAudioAlbumArt,
  generateAudioWaveform,
  createZipStream,
  needsVideoPreview,
  BROWSER_NATIVE_VIDEO_FORMATS,
  AUDIO_FORMATS_WITH_ART,
  SHARP_NATIVE_FORMATS,
  RAW_IMAGE_FORMATS,
  HEIC_FORMATS,
};

export default MediaUtils;
