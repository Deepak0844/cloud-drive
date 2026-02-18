// Native modules
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

/**
 * Generates HLS segments for a video
 * @param {string} sourcePath - The path to the source video
 * @param {string} destFolder - The folder to save HLS segments
 * @returns {Promise<string>} - The path to the .m3u8 manifest
 */
function generateHLS(sourcePath, destFolder) {
  ensureDirectoryExists(destFolder);
  const manifestPath = path.join(destFolder, "index.m3u8");

  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .outputOptions([
        "-profile:v baseline",
        "-level 3.0",
        "-s 640x360",
        "-start_number 0",
        "-hls_time 10",
        "-hls_list_size 0",
        "-f hls",
      ])
      .on("start", (command) => logger.debug("[FFMPEG] HLS command:", command))
      .on("end", () => {
        logger.info("[FFMPEG] HLS generated:", manifestPath);
        resolve(manifestPath);
      })
      .on("error", (err) => {
        logger.error("[FFMPEG] HLS generation error:", err.message);
        reject(err);
      })
      .save(manifestPath);
  });
}

/**
 * Extracts album art from an audio file and saves it as a JPEG
 * @param {string} sourcePath - The path to the audio file
 * @param {string} destPath - The path to save the thumbnail
 */
async function extractAudioAlbumArt(sourcePath, destPath) {
  try {
    const destDir = path.dirname(destPath);
    ensureDirectoryExists(destDir);

    const { parseFile } = await import("music-metadata");
    const metadata = await parseFile(sourcePath);

    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      await sharp(picture.data).resize(200, 200, { fit: "cover" }).toFormat("jpeg").toFile(destPath);

      logger.info("[Thumbnail] Audio album art extracted:", destPath);
      return destPath;
    }
    return null;
  } catch (error) {
    logger.error(`[Thumbnail] Audio album art extraction failed for ${sourcePath}: ${error.message}`);
    return null;
  }
}

/**
 * Creates a ZIP archive from a list of files and folders
 * @param {Array} items - List of items { path, name, type }
 * @param {Stream} outputStream - The stream to write the ZIP to
 * @returns {Promise} - Resolves when the ZIP is finalized
 */
function createZipStream(items, outputStream) {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 5 }, // Moderate compression
    });

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

// Exports
const MediaUtils = {
  generateImageThumbnail,
  generateVideoThumbnail,
  generateVideoPreview,
  generateHLS,
  extractAudioAlbumArt,
  createZipStream,
};

export default MediaUtils;
