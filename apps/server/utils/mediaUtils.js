import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import heicConvert from "heic-convert";

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Creates a directory if it does not exist.
 * @param {string} dirPath - The directory path to create.
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generates a thumbnail for an image.
 * @param {string} sourcePath - The path to the source image.
 * @param {string} destPath - The path to save the generated thumbnail.
 */
async function generateImageThumbnail(sourcePath, destPath) {
  const destDir = path.dirname(destPath);
  ensureDirectoryExists(destDir);

  let input = sourcePath;
  const ext = path.extname(sourcePath).toLowerCase();

  // Convert HEIC to JPEG buffer if necessary
  if (ext === ".heic" || ext === ".heif") {
    const inputBuffer = await fsPromises.readFile(sourcePath);
    input = await heicConvert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.8,
    });
  }

  await sharp(input).resize(200, 200, { fit: "cover" }).toFormat("jpeg").toFile(destPath);
}

/**
 * Generates a thumbnail for a video.
 * @param {string} sourcePath - The path to the source video.
 * @param {string} destFolder - The folder to save the thumbnail.
 * @param {string} filename - The name of the thumbnail file.
 * @returns {Promise<string>} - The path to the generated thumbnail.
 */
function generateVideoThumbnail(sourcePath, destFolder, filename) {
  ensureDirectoryExists(destFolder);
  const destPath = path.join(destFolder, filename);

  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .inputOptions(["-ss 0.5"])
      .outputOptions(["-vframes 1", "-q:v 2", "-vf scale=200:200:force_original_aspect_ratio=increase,crop=200:200"])
      .on("start", (command) => console.log("[FFMPEG] Thumb command:", command))
      .on("end", () => resolve(destPath))
      .on("error", (err) => {
        console.error("[FFMPEG] Thumb error:", err.message);
        // Fallback to 0 seconds if 0.5 failed
        ffmpeg(sourcePath)
          .outputOptions(["-vframes 1", "-vf scale=200:200:force_original_aspect_ratio=increase,crop=200:200"])
          .on("end", () => resolve(destPath))
          .on("error", (err2) => reject(err2))
          .save(destPath);
      })
      .save(destPath);
  });
}

/**
 * Generates a web-friendly MP4 preview for a video.
 * @param {string} sourcePath - The path to the source video.
 * @param {string} destPath - The path to save the generated preview.
 * @returns {Promise<string>} - The path to the generated preview.
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
      .on("start", (command) => console.log("[FFMPEG] Transcoding preview:", command))
      .on("end", () => {
        console.log("[FFMPEG] Preview generated:", destPath);
        resolve(destPath);
      })
      .on("error", (err) => {
        console.error("[FFMPEG] Preview generation error:", err.message);
        reject(err);
      })
      .save(destPath);
  });
}

// Exports
// ----------------------------------
const MediaUtils = {
  generateImageThumbnail,
  generateVideoThumbnail,
  generateVideoPreview,
};

export default MediaUtils;
