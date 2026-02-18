// Native modules
import fs from "fs";
import path from "path";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Config
import config from "../config/env.js";

// Utils
import logger from "../utils/logger.js";
import MediaUtils from "../utils/mediaUtils.js";

// Services
import FaceService from "./face.service.js";

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
 * Get user streaming directory
 * @param {String} userId - User ID
 * @returns {String} - Path to streaming directory
 */
function getStreamingDir(userId) {
  const streamingDir = path.join(config.NAS_STORAGE_PATH, "users", userId, "streaming");
  if (!fs.existsSync(streamingDir)) {
    fs.mkdirSync(streamingDir, { recursive: true });
  }
  return streamingDir;
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
 * Process and save thumbnails/previews for a file.
 * Handles all image, video, and audio formats robustly.
 * @param {Object} file - File model instance
 */
async function processThumbnails(file) {
  const userId = file.user.toString();
  const fileId = file._id.toString();
  const isImage = file.mime_type.startsWith("image/");
  const isVideo = file.mime_type.startsWith("video/");
  const isAudio = file.category === "audio" || file.mime_type.startsWith("audio/");

  // ── Images ──────────────────────────────────────────────────────────────────
  if (isImage) {
    try {
      const thumbnailDir = getThumbnailDir(userId);
      const thumbPath = path.join(thumbnailDir, `${fileId}.jpg`);
      await MediaUtils.generateImageThumbnail(file.storage_path, thumbPath);
      file.thumbnail_path = thumbPath;
      logger.info(`[Service] Image thumbnail saved for file ${fileId}`);

      // Background face detection (non-blocking)
      FaceService.detectFaces(file).catch((err) => logger.error("Face detection trigger failed:", err.message));
    } catch (err) {
      logger.error(`[Service] Image thumbnail failed for ${fileId}:`, err.message);
    }
  }

  // ── Videos ──────────────────────────────────────────────────────────────────
  else if (isVideo) {
    // 1. Thumbnail (duration-aware seeking, fallback chain)
    try {
      const thumbnailDir = getThumbnailDir(userId);
      const thumbPath = path.join(thumbnailDir, `${fileId}.jpg`);
      await MediaUtils.generateVideoThumbnail(file.storage_path, thumbnailDir, `${fileId}.jpg`);
      file.thumbnail_path = thumbPath;
      logger.info(`[Service] Video thumbnail saved for file ${fileId}`);
    } catch (err) {
      logger.error(`[Service] Video thumbnail failed for ${fileId}:`, err.message);
    }

    // 2. HLS segments (adaptive resolution)
    try {
      const streamingDir = getStreamingDir(userId);
      const videoStreamDir = path.join(streamingDir, fileId);
      await MediaUtils.generateHLS(file.storage_path, videoStreamDir);
      file.streaming_path = path.join(videoStreamDir, "index.m3u8");
      logger.info(`[Service] HLS generated for file ${fileId}`);
    } catch (err) {
      logger.error(`[Service] HLS generation failed for ${fileId}:`, err.message);
    }

    // 3. MP4 Preview — for ALL non-browser-native formats (MOV, AVI, MKV, WMV, FLV, TS, 3GP, etc.)
    if (MediaUtils.needsVideoPreview(file.storage_path, file.mime_type)) {
      try {
        const previewDir = getPreviewDir(userId);
        const previewPath = path.join(previewDir, `${fileId}.mp4`);
        await MediaUtils.generateVideoPreview(file.storage_path, previewPath);
        file.preview_path = previewPath;
        logger.info(`[Service] MP4 preview generated for file ${fileId}`);
      } catch (err) {
        logger.error(`[Service] MP4 preview failed for ${fileId}:`, err.message);
      }
    }
  }

  // ── Audio ────────────────────────────────────────────────────────────────────
  else if (isAudio) {
    try {
      const thumbnailDir = getThumbnailDir(userId);
      const thumbPath = path.join(thumbnailDir, `${fileId}.jpg`);
      // extractAudioAlbumArt already falls back to waveform internally
      const extractedThumb = await MediaUtils.extractAudioAlbumArt(file.storage_path, thumbPath);
      if (extractedThumb) {
        file.thumbnail_path = extractedThumb;
        logger.info(`[Service] Audio thumbnail saved for file ${fileId}`);
      }
    } catch (err) {
      logger.error(`[Service] Audio thumbnail failed for ${fileId}:`, err.message);
    }
  }

  await file.save();
  return file;
}

/**
 * Bulk move items (files and folders) to a new target folder
 * @param {String} userId - User ID
 * @param {Array} itemIds - Array of { id, type }
 * @param {String} targetFolderId - Destination folder ID
 */
async function bulkMove(userId, items, targetFolderId) {
  for (const item of items) {
    if (item.type === "file") {
      await File.findOneAndUpdate({ _id: item.id, user: userId }, { folder: targetFolderId || null });
    } else if (item.type === "folder") {
      // Prevent moving a folder into itself
      if (item.id === targetFolderId) {
        continue;
      }
      await Folder.findOneAndUpdate({ _id: item.id, user: userId }, { parent: targetFolderId || null });
      // Note: Full path updates for children are usually handled by a post-save hook or dedicated service
      // For now, updating the parent is sufficient as most queries use parent ID
    }
  }
}

/**
 * Bulk copy items (files and folders) to a new target folder
 * @param {String} userId - User ID
 * @param {Array} items - Array of { id, type }
 * @param {String} targetFolderId - Destination folder ID
 */
async function bulkCopy(userId, items, targetFolderId) {
  for (const item of items) {
    if (item.type === "file") {
      await copyFileInternal(userId, item.id, targetFolderId);
    } else if (item.type === "folder") {
      await copyFolderInternal(userId, item.id, targetFolderId);
    }
  }
}

/**
 * Internal helper to copy a single file
 */
async function copyFileInternal(userId, fileId, targetFolderId) {
  const sourceFile = await File.findOne({ _id: fileId, user: userId });
  if (!sourceFile) {
    return;
  }

  const uniqueName = await getUniqueFilename(userId, targetFolderId, sourceFile.original_name);
  const userDir = getUserDir(userId);
  const newFilename = `${Date.now()}-${uniqueName}`;
  const newPath = path.join(userDir, newFilename);

  // Copy physical file
  if (fs.existsSync(sourceFile.storage_path)) {
    fs.copyFileSync(sourceFile.storage_path, newPath);
  }

  // Create new DB entry
  const newFileData = sourceFile.toObject();
  delete newFileData._id;
  delete newFileData.createdAt;
  delete newFileData.updatedAt;

  const newFile = await File.create({
    ...newFileData,
    name: uniqueName,
    folder: targetFolderId || null,
    storage_path: newPath,
    // Reset thumbnail/preview paths as they'll be regenerated or we can copy them too
    thumbnail_path: null,
    preview_path: null,
    streaming_path: null,
  });

  // Trigger thumbnail generation for the copy
  processThumbnails(newFile).catch((err) => logger.error("[BulkCopy] Thumbnail generation failed:", err.message));

  return newFile;
}

/**
 * Internal helper to recursively copy a folder
 */
async function copyFolderInternal(userId, folderId, targetFolderId) {
  const sourceFolder = await Folder.findOne({ _id: folderId, user: userId });
  if (!sourceFolder) {
    return;
  }

  // Create new folder entry
  const newFolderName = sourceFolder.name; // We might want getUniqueFolderName here too
  const newFolder = await Folder.create({
    name: newFolderName,
    user: userId,
    parent: targetFolderId || null,
    path: targetFolderId ? "child" : "/", // Simplified path logic
  });

  // Copy files inside this folder
  const files = await File.find({ folder: folderId, user: userId, is_deleted: false });
  for (const file of files) {
    await copyFileInternal(userId, file._id, newFolder._id);
  }

  // Copy subfolders recursively
  const subfolders = await Folder.find({ parent: folderId, user: userId, is_deleted: false });
  for (const subfolder of subfolders) {
    await copyFolderInternal(userId, subfolder._id, newFolder._id);
  }

  return newFolder;
}

// Exports
const FileService = {
  getUserDir,
  getThumbnailDir,
  getPreviewDir,
  getStreamingDir,
  checkQuota,
  getUniqueFilename,
  processThumbnails,
  bulkMove,
  bulkCopy,
};

export default FileService;
