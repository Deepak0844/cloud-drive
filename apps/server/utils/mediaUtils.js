// Native modules
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

// Third-party modules
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

/**
 * Creates a directory if it does not exist
 * @param {string} dirPath - The directory path to create
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generates a thumbnail for an image
 * Supports all common image formats including HEIC/HEIF
 * @param {string} sourcePath - The path to the source image
 * @param {string} destPath - The path to save the generated thumbnail
 */
async function generateImageThumbnail(sourcePath, destPath) {
  try {
    const destDir = path.dirname(destPath);
    ensureDirectoryExists(destDir);

    let input = sourcePath;
    const ext = path.extname(sourcePath).toLowerCase();

    // Convert HEIC/HEIF to JPEG buffer if necessary
    if (ext === ".heic" || ext === ".heif") {
      try {
        logger.debug(`[Thumbnail] Converting HEIC/HEIF image: ${sourcePath}`);
        const inputBuffer = await fsPromises.readFile(sourcePath);
        input = await heicConvert({
          buffer: inputBuffer,
          format: "JPEG",
          quality: 0.8,
        });
        logger.debug(`[Thumbnail] HEIC conversion successful`);
      } catch (heicError) {
        logger.error(`[Thumbnail] HEIC conversion failed: ${heicError.message}`);
        throw new Error(`HEIC conversion failed: ${heicError.message}`);
      }
    }

    // Generate thumbnail with sharp
    await sharp(input)
      .resize(200, 200, {
        fit: "cover",
        withoutEnlargement: false,
      })
      .toFormat("jpeg", { quality: 85 })
      .toFile(destPath);

    logger.info(`[Thumbnail] Image thumbnail generated: ${destPath}`);
    return destPath;
  } catch (error) {
    logger.error(`[Thumbnail] Image thumbnail generation failed for ${sourcePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Generates a thumbnail for a video
 * Supports all common video formats with multiple fallback strategies
 * @param {string} sourcePath - The path to the source video
 * @param {string} destFolder - The folder to save the thumbnail
 * @param {string} filename - The name of the thumbnail file
 * @returns {Promise<string>} - The path to the generated thumbnail
 */
function generateVideoThumbnail(sourcePath, destFolder, filename) {
  ensureDirectoryExists(destFolder);
  const destPath = path.join(destFolder, filename);

  return new Promise((resolve, reject) => {
    logger.debug(`[Thumbnail] Generating video thumbnail for: ${sourcePath}`);

    // Primary attempt: seek to 0.5 seconds
    ffmpeg(sourcePath)
      .inputOptions(["-ss 0.5"])
      .outputOptions(["-vframes 1", "-q:v 2", "-vf scale=200:200:force_original_aspect_ratio=increase,crop=200:200"])
      .on("start", (command) => logger.debug(`[FFMPEG] Thumb command: ${command}`))
      .on("end", () => {
        logger.info(`[Thumbnail] Video thumbnail generated: ${destPath}`);
        resolve(destPath);
      })
      .on("error", (err) => {
        logger.warn(`[FFMPEG] Primary thumb attempt failed (0.5s): ${err.message}`);

        // Fallback 1: Try at 0 seconds
        ffmpeg(sourcePath)
          .outputOptions([
            "-vframes 1",
            "-q:v 2",
            "-vf scale=200:200:force_original_aspect_ratio=increase,crop=200:200",
          ])
          .on("start", (command) => logger.debug(`[FFMPEG] Fallback thumb command: ${command}`))
          .on("end", () => {
            logger.info(`[Thumbnail] Video thumbnail generated (fallback): ${destPath}`);
            resolve(destPath);
          })
          .on("error", (err2) => {
            logger.warn(`[FFMPEG] Fallback thumb attempt failed (0s): ${err2.message}`);

            // Fallback 2: Try without scaling/cropping
            ffmpeg(sourcePath)
              .outputOptions(["-vframes 1", "-q:v 2"])
              .on("end", () => {
                logger.info(`[Thumbnail] Video thumbnail generated (simple fallback): ${destPath}`);
                resolve(destPath);
              })
              .on("error", (err3) => {
                logger.error(`[FFMPEG] All thumbnail attempts failed: ${err3.message}`);
                reject(new Error(`Video thumbnail generation failed: ${err3.message}`));
              })
              .save(destPath);
          })
          .save(destPath);
      })
      .save(destPath);
  });
}

/**
 * Generates a web-friendly MP4 preview for a video
 * @param {string} sourcePath - The path to the source video
 * @param {string} destPath - The path to save the generated preview
 * @returns {Promise<string>} - The path to the generated preview
 */
function generateVideoPreview(sourcePath, destPath) {
  const destDir = path.dirname(destPath);
  ensureDirectoryExists(destDir);

  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .outputOptions([
        "-c:v libx264",
        "-crf 23",
        "-preset fast",
        "-c:a aac",
        "-b:a 128k",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2",
      ])
      .toFormat("mp4")
      .on("start", (command) => logger.debug("[FFMPEG] Transcoding preview:", command))
      .on("end", () => {
        logger.info("[FFMPEG] Preview generated:", destPath);
        resolve(destPath);
      })
      .on("error", (err) => {
        logger.error("[FFMPEG] Preview generation error:", err.message);
        reject(err);
      })
      .save(destPath);
  });
}

// Exports
const MediaUtils = {
  generateImageThumbnail,
  generateVideoThumbnail,
  generateVideoPreview,
};

export default MediaUtils;
