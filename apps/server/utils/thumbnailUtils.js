/**
 * thumbnailUtils.js
 *
 * All thumbnail and album-art generation for images, videos, and audio files.
 * Depends on mediaCore.js for shared ffmpeg paths, format registries, and crypto helpers.
 */

// Native modules
import { execFile } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

// Third-party modules
import heicConvert from "heic-convert";
import sharp from "sharp";

// Utils
import logger from "#utils/logger.js";
import {
  resolvedFfmpegPath,
  decryptToTemp,
  ensureDirectoryExists,
  hasVideoStream,
  getVideoDuration,
  HEIC_FORMATS,
  RAW_IMAGE_FORMATS,
  SHARP_NATIVE_FORMATS,
} from "#utils/mediaCore.js";
import { MediaProcessing } from "#constants/generalConstants.js";

const {
  THUMBNAIL_SIZE,
  THUMBNAIL_JPEG_QUALITY,
  HEIC_CONVERT_QUALITY,
  FFMPEG_MAX_BUFFER,
  FFMPEG_TIMEOUT_MS,
  MIN_VALID_JPEG_BYTES,
  VIDEO_SEEK_FRACTION,
  VIDEO_SEEK_MIN_S,
  VIDEO_SEEK_MAX_S,
} = MediaProcessing;

// ─── Image Thumbnails ──────────────────────────────────────────────────────────

/**
 * Extract a JPEG from a RAW camera file using ffmpeg.
 */
function extractRawImageFrame(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    execFile(
      resolvedFfmpegPath,
      ["-y", "-i", sourcePath, "-vframes", "1", "-q:v", "2", "-f", "mjpeg", destPath],
      { maxBuffer: FFMPEG_MAX_BUFFER },
      (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(`RAW extraction failed: ${err.message}\n${stderr}`));
        } else {
          resolve(destPath);
        }
      }
    );
  });
}

/**
 * Generates a thumbnail (300×300 JPEG) for any image format.
 * Supports: JPEG, PNG, GIF, WebP, AVIF, TIFF, BMP, SVG, HEIC/HEIF, RAW (CR2, NEF, ARW, DNG…)
 *
 * @param {string} sourcePath - Path to the encrypted source image
 * @param {string} destPath   - Path to save the unencrypted thumbnail
 * @param {Buffer} userKey    - Unwrapped DEK
 * @param {Buffer} iv         - File IV
 * @returns {Promise<string>} - Resolved path of the generated thumbnail
 */
async function generateImageThumbnail(sourcePath, destPath, userKey, iv) {
  ensureDirectoryExists(path.dirname(destPath));

  const ext = path.extname(sourcePath).toLowerCase();
  let unencryptedSource = null;

  try {
    unencryptedSource = await decryptToTemp(sourcePath, userKey, iv);

    // ── HEIC/HEIF ────────────────────────────────────────────────────────────
    if (HEIC_FORMATS.has(ext)) {
      logger.debug(`[Thumbnail] HEIC/HEIF detected: ${sourcePath}`);
      const inputBuffer = await fsPromises.readFile(unencryptedSource);
      const jpegBuffer = await heicConvert({ buffer: inputBuffer, format: "JPEG", quality: HEIC_CONVERT_QUALITY });
      await sharp(jpegBuffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", withoutEnlargement: false })
        .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
        .toFile(destPath);
      logger.info(`[Thumbnail] HEIC thumbnail generated: ${destPath}`);
      return destPath;
    }

    // ── RAW camera formats ───────────────────────────────────────────────────
    if (RAW_IMAGE_FORMATS.has(ext)) {
      logger.debug(`[Thumbnail] RAW format detected (${ext}): ${sourcePath}`);
      const tempJpeg = destPath.replace(".jpg", "_raw_temp.jpg");
      try {
        await extractRawImageFrame(unencryptedSource, tempJpeg);
        await sharp(tempJpeg)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
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

    // ── SVG ──────────────────────────────────────────────────────────────────
    if (ext === ".svg") {
      logger.debug(`[Thumbnail] SVG detected: ${sourcePath}`);
      await sharp(unencryptedSource, { density: 150 })
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
        .toFile(destPath);
      logger.info(`[Thumbnail] SVG thumbnail generated: ${destPath}`);
      return destPath;
    }

    // ── AVIF — sharp → sips (macOS) → ffmpeg fallback chain ─────────────────
    if (ext === ".avif") {
      logger.debug(`[Thumbnail] AVIF detected: ${sourcePath}`);

      try {
        await sharp(unencryptedSource)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
          .toFile(destPath);
        logger.info(`[Thumbnail] AVIF thumbnail generated via sharp: ${destPath}`);
        return destPath;
      } catch (sharpErr) {
        logger.warn(`[Thumbnail] AVIF sharp failed (${sharpErr.message}), trying sips fallback`);
      }

      const sipsTempJpeg = destPath.replace(".jpg", "_sips_temp.jpg");
      try {
        await new Promise((resolve, reject) => {
          execFile(
            "sips",
            [
              "-s",
              "format",
              "jpeg",
              "-s",
              "formatOptions",
              String(THUMBNAIL_JPEG_QUALITY),
              "-Z",
              String(THUMBNAIL_SIZE),
              unencryptedSource,
              "--out",
              sipsTempJpeg,
            ],
            { timeout: FFMPEG_TIMEOUT_MS },
            (err) => (err ? reject(err) : resolve())
          );
        });
        await sharp(sipsTempJpeg)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
          .toFile(destPath);
        fs.unlinkSync(sipsTempJpeg);
        logger.info(`[Thumbnail] AVIF thumbnail generated via sips fallback: ${destPath}`);
        return destPath;
      } catch (sipsErr) {
        if (fs.existsSync(sipsTempJpeg)) {
          fs.unlinkSync(sipsTempJpeg);
        }
        logger.warn(`[Thumbnail] AVIF sips fallback failed (${sipsErr.message}), trying ffmpeg`);
      }

      const ffmpegTempJpeg = destPath.replace(".jpg", "_avif_temp.jpg");
      try {
        await extractRawImageFrame(unencryptedSource, ffmpegTempJpeg);
        await sharp(ffmpegTempJpeg)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", withoutEnlargement: false })
          .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
          .toFile(destPath);
        fs.unlinkSync(ffmpegTempJpeg);
        logger.info(`[Thumbnail] AVIF thumbnail generated via ffmpeg fallback: ${destPath}`);
        return destPath;
      } catch (fallbackErr) {
        logger.error(`[Thumbnail] AVIF all fallbacks failed: ${fallbackErr.message}`);
        if (fs.existsSync(ffmpegTempJpeg)) {
          fs.unlinkSync(ffmpegTempJpeg);
        }
        throw fallbackErr;
      }
    }

    // ── All other sharp-native formats (JPEG, PNG, WebP, TIFF, BMP, GIF) ────
    if (SHARP_NATIVE_FORMATS.has(ext) || ext === "") {
      await sharp(unencryptedSource)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", withoutEnlargement: false })
        .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
        .toFile(destPath);
      logger.info(`[Thumbnail] Image thumbnail generated (${ext || "unknown"}): ${destPath}`);
      return destPath;
    }

    // ── Unknown format: attempt sharp anyway ─────────────────────────────────
    logger.warn(`[Thumbnail] Unknown image format (${ext}), attempting sharp fallback`);
    await sharp(unencryptedSource)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
      .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
      .toFile(destPath);
    return destPath;
  } catch (error) {
    logger.error(`[Thumbnail] Image thumbnail failed for ${sourcePath}: ${error.message}`);
    throw error;
  } finally {
    if (unencryptedSource && fs.existsSync(unencryptedSource)) {
      await fsPromises.unlink(unencryptedSource).catch(() => {});
    }
  }
}

// ─── Video Thumbnails ──────────────────────────────────────────────────────────

/**
 * Run a single ffmpeg thumbnail attempt.
 */
function runVideoThumbnailAttempt(unencryptedPath, destPath, seekSeconds, withScale, frameOffset = 0) {
  return new Promise((resolve, reject) => {
    const selectPrefix = frameOffset > 0 ? `select=gte(n\\,${frameOffset}),setpts=PTS-STARTPTS,` : "";
    const vf = withScale
      ? `${selectPrefix}scale=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE}:force_original_aspect_ratio=increase,crop=${THUMBNAIL_SIZE}:${THUMBNAIL_SIZE},format=yuv420p`
      : `${selectPrefix}format=yuv420p`;

    const args = ["-y"];
    if (seekSeconds > 0) {
      args.push("-ss", String(seekSeconds));
    }
    args.push("-i", unencryptedPath, "-vframes", "1", "-q:v", "2", "-vf", vf, "-f", "mjpeg", destPath);

    execFile(resolvedFfmpegPath, args, { maxBuffer: FFMPEG_MAX_BUFFER }, (err, _stdout, stderr) => {
      if (err) {
        reject(
          new Error(
            `ffmpeg thumbnail failed (seek=${seekSeconds}s, frame=${frameOffset}): ${err.message}\n${stderr.slice(-500)}`
          )
        );
        return;
      }
      const size = fs.existsSync(destPath) ? fs.statSync(destPath).size : 0;
      if (size < MIN_VALID_JPEG_BYTES) {
        reject(
          new Error(
            `ffmpeg produced ${size === 0 ? "empty" : "suspiciously-small (black frame)"} output (${size}B, seek=${seekSeconds}s, frame=${frameOffset})`
          )
        );
      } else {
        resolve(destPath);
      }
    });
  });
}

/**
 * Generates a thumbnail for any video format with duration-aware seeking and fallback chain.
 * Supports: MP4, MKV, AVI, MOV, WMV, FLV, TS, WebM, M4V, 3GP, OGV, and more.
 *
 * @param {string} sourcePath  - Path to the encrypted source video
 * @param {string} destFolder  - Folder to save the thumbnail
 * @param {string} filename    - Thumbnail filename
 * @param {Buffer} userKey     - Unwrapped DEK
 * @param {Buffer} iv          - File IV
 * @returns {Promise<string>}  - Resolved path of the generated thumbnail
 */
async function generateVideoThumbnail(sourcePath, destFolder, filename, userKey, iv) {
  ensureDirectoryExists(destFolder);
  const destPath = path.join(destFolder, filename);

  logger.debug(`[Thumbnail] Generating video thumbnail: ${sourcePath}`);

  let unencryptedSource = null;
  try {
    unencryptedSource = await decryptToTemp(sourcePath, userKey, iv);

    const videoStreamExists = await hasVideoStream(unencryptedSource);
    if (!videoStreamExists) {
      logger.warn(`[Thumbnail] No video stream found in: ${sourcePath}`);
      throw new Error("No video stream found in file");
    }

    const duration = await getVideoDuration(unencryptedSource);
    logger.debug(`[Thumbnail] Video duration: ${duration}s`);

    let attempts;
    if (duration > 0) {
      const seekTime = Math.min(Math.max(duration * VIDEO_SEEK_FRACTION, VIDEO_SEEK_MIN_S), VIDEO_SEEK_MAX_S);
      logger.debug(`[Thumbnail] Seek-capable file, target: ${seekTime.toFixed(1)}s`);
      attempts = [
        { seek: seekTime, scale: true, frameOffset: 5, label: `seek ${seekTime.toFixed(1)}s + frame5 + scale` },
        { seek: seekTime, scale: true, frameOffset: 0, label: `seek ${seekTime.toFixed(1)}s + scale` },
        { seek: seekTime, scale: false, frameOffset: 0, label: `seek ${seekTime.toFixed(1)}s no scale` },
        { seek: 0, scale: true, frameOffset: 5, label: "start + frame5 + scale" },
        { seek: 0, scale: true, frameOffset: 0, label: "start + scale" },
        { seek: 0, scale: false, frameOffset: 0, label: "start no scale" },
      ];
    } else {
      logger.debug(`[Thumbnail] No seekable duration — using frame-select approach`);
      attempts = [
        { seek: 0, scale: true, frameOffset: 5, label: "frame5 + scale" },
        { seek: 0, scale: true, frameOffset: 30, label: "frame30 + scale" },
        { seek: 0, scale: true, frameOffset: 60, label: "frame60 + scale" },
        { seek: 0, scale: true, frameOffset: 100, label: "frame100 + scale" },
        { seek: 0, scale: false, frameOffset: 30, label: "frame30 no scale" },
        { seek: 0, scale: false, frameOffset: 5, label: "frame5 no scale" },
        { seek: 0, scale: false, frameOffset: 0, label: "frame0 no scale" },
        { seek: 0, scale: true, frameOffset: 0, label: "frame0 + scale" },
      ];
    }

    for (const attempt of attempts) {
      try {
        await runVideoThumbnailAttempt(unencryptedSource, destPath, attempt.seek, attempt.scale, attempt.frameOffset);
        logger.info(`[Thumbnail] Video thumbnail generated (${attempt.label}): ${destPath}`);
        return destPath;
      } catch (err) {
        logger.warn(`[Thumbnail] Attempt failed (${attempt.label}): ${err.message}`);
      }
    }

    throw new Error(`Video thumbnail generation failed for: ${sourcePath}`);
  } finally {
    if (unencryptedSource && fs.existsSync(unencryptedSource)) {
      await fsPromises.unlink(unencryptedSource).catch(() => {});
    }
  }
}

// ─── Audio Album Art ───────────────────────────────────────────────────────────

/**
 * Generates a waveform image from an audio file (used as album-art fallback).
 */
function generateAudioWaveform(sourcePath, destPath) {
  ensureDirectoryExists(path.dirname(destPath));

  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      sourcePath,
      "-filter_complex",
      "showwavespic=s=800x200:colors=0088FF",
      "-frames:v",
      "1",
      "-f",
      "mjpeg",
      destPath,
    ];

    execFile(resolvedFfmpegPath, args, { maxBuffer: FFMPEG_MAX_BUFFER }, (err, _stdout, stderr) => {
      if (err) {
        logger.error(`[FFMPEG] Waveform error: ${err.message}\n${stderr.slice(-300)}`);
        reject(new Error(`Waveform generation failed: ${err.message}`));
      } else {
        logger.info("[FFMPEG] Waveform generated:", destPath);
        resolve(destPath);
      }
    });
  });
}

/**
 * Extracts album art from an audio file and saves it as a JPEG.
 * Falls back to generating a waveform image if no album art is found.
 *
 * @param {string} sourcePath - Path to the encrypted audio file
 * @param {string} destPath   - Path to save the unencrypted thumbnail
 * @param {Buffer} userKey    - Unwrapped DEK
 * @param {Buffer} iv         - File IV
 * @returns {Promise<string>}
 */
async function extractAudioAlbumArt(sourcePath, destPath, userKey, iv) {
  ensureDirectoryExists(path.dirname(destPath));

  let unencryptedSource = null;

  try {
    unencryptedSource = await decryptToTemp(sourcePath, userKey, iv);

    // Step 1: extract embedded album art
    try {
      const { parseFile } = await import("music-metadata");
      const metadata = await parseFile(unencryptedSource);

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        await sharp(picture.data)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
          .toFormat("jpeg", { quality: THUMBNAIL_JPEG_QUALITY })
          .toFile(destPath);
        logger.info("[Thumbnail] Audio album art extracted:", destPath);
        return destPath;
      }
    } catch (err) {
      logger.warn(`[Thumbnail] Album art extraction failed for ${sourcePath}: ${err.message}`);
    }

    // Step 2: waveform fallback
    try {
      await generateAudioWaveform(unencryptedSource, destPath);
      return destPath;
    } catch (waveErr) {
      logger.warn(`[Thumbnail] Waveform fallback also failed for ${sourcePath}: ${waveErr.message}`);
    }

    throw new Error(`No album art or waveform could be generated for: ${sourcePath}`);
  } finally {
    if (unencryptedSource && fs.existsSync(unencryptedSource)) {
      await fsPromises.unlink(unencryptedSource).catch(() => {});
    }
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────────

const ThumbnailUtils = {
  extractRawImageFrame,
  generateImageThumbnail,
  runVideoThumbnailAttempt,
  generateVideoThumbnail,
  generateAudioWaveform,
  extractAudioAlbumArt,
};

export default ThumbnailUtils;
