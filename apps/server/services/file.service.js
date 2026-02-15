import fs from "fs";
import path from "path";

// Config
import config from "../config/env.js";

// Models
import File from "../models/File.js";
import User from "../models/User.js";

// Utils
import MediaUtils from "../utils/mediaUtils.js";
import logger from "../utils/logger.js";

/**
 * Get core user storage directory
 * @param {String} userId - User ID
 * @returns {String} - Path to user storage directory
 */
function getUserDir(userId) {
  const userDir = path.join(config.NAS_STORAGE_PATH, "users", userId, "files");
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

/**
 * Get user thumbnail directory
 * @param {String} userId - User ID
 * @returns {String} - Path to thumbnail directory
 */
function getThumbnailDir(userId) {
  const thumbDir = path.join(config.NAS_STORAGE_PATH, "users", userId, "thumbnails");
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }
  return thumbDir;
}

/**
 * Get user preview directory
 * @param {String} userId - User ID
 * @returns {String} - Path to preview directory
 */
function getPreviewDir(userId) {
  const previewDir = path.join(config.NAS_STORAGE_PATH, "users", userId, "previews");
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }
  return previewDir;
}

/**
 * Check if user has enough quota for incoming file size
 * @param {String} userId - User ID
 * @param {Number} incomingBytes - Size of incoming file in bytes
 * @returns {Boolean} - True if within quota, false otherwise
 */
async function checkQuota(userId, incomingBytes) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user.used_bytes + incomingBytes <= user.quota_bytes;
}

/**
 * Check for duplicate filenames and auto-increment if exists
 * @param {String} userId - User ID
 * @param {String} folderId - Folder ID (can be null for root)
 * @param {String} originalName - Original filename
 * @returns {String} - Unique filename to use
 */
async function getUniqueFilename(userId, folderId, originalName) {
  const extIndex = originalName.lastIndexOf(".");
  const nameWithoutExt = extIndex > 0 ? originalName.substring(0, extIndex) : originalName;
  const ext = extIndex > 0 ? originalName.substring(extIndex) : "";

  let name = originalName;
  let counter = 1;

  while (await File.exists({ user: userId, folder: folderId || null, name, is_deleted: false })) {
    name = `${nameWithoutExt} (${counter})${ext}`;
    counter++;
  }

  return name;
}

/**
 * Process and save thumbnails/previews
 */
async function processThumbnails(file) {
  const userId = file.user.toString();
  const fileId = file._id.toString();
  const isImage = file.mime_type.startsWith("image/");
  const isVideo = file.mime_type.startsWith("video/");

  if (isImage) {
    try {
      const thumbnailDir = getThumbnailDir(userId);
      const thumbPath = path.join(thumbnailDir, `${fileId}.jpg`);
      await MediaUtils.generateImageThumbnail(file.storage_path, thumbPath);
      file.thumbnail_path = thumbPath;
    } catch (err) {
      logger.error("[Thumbnail] Image generation failed:", err.message);
    }
  } else if (isVideo) {
    try {
      const thumbnailDir = getThumbnailDir(userId);
      const thumbPath = path.join(thumbnailDir, `${fileId}.jpg`);
      await MediaUtils.generateVideoThumbnail(file.storage_path, thumbnailDir, `${fileId}.jpg`);
      file.thumbnail_path = thumbPath;
    } catch (err) {
      logger.error("[Thumbnail] Video thumbnail failed:", err.message);
    }

    // Generate preview for MOV files
    const isMovFile = file.mime_type === "video/quicktime" || file.name.toLowerCase().endsWith(".mov");
    if (isMovFile) {
      try {
        const previewDir = getPreviewDir(userId);
        const previewPath = path.join(previewDir, `${fileId}.mp4`);
        await MediaUtils.generateVideoPreview(file.storage_path, previewPath);
        file.preview_path = previewPath;
      } catch (err) {
        logger.error("[Preview] Video preview failed:", err.message);
      }
    }
  }

  await file.save();
  return file;
}

// Exports
const FileService = {
  getUserDir,
  getThumbnailDir,
  getPreviewDir,
  checkQuota,
  getUniqueFilename,
  processThumbnails,
};

export default FileService;
