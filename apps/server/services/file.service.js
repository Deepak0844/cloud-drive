// Native modules
import fs from "fs";
import path from "path";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Config
import config from "../config/env.js";

// ─── Path Helpers ─────────────────────────────────────────────────────────────

/**
 * Root storage dir for a user's files.
 * @param {string} userId
 * @returns {string}
 */
function getUserDir(userId) {
  const userDir = path.join(config.NAS_STORAGE_PATH, "users", userId, "files");
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

/**
 * Stable physical path for a file.
 * Filename is <fileId><ext> stored inside a 2-char hex bucket subdir.
 * This path never changes — renaming a file only updates the DB `name` field.
 *
 * @param {string} userId
 * @param {string} fileId  — MongoDB ObjectId string
 * @param {string} extension — with leading dot, e.g. ".mp4"  (pass "" for no ext)
 * @returns {string}
 */
function getPhysicalFilePath(userId, fileId, extension) {
  const bucket = fileId.toString().slice(0, 2);
  const bucketDir = path.join(config.NAS_STORAGE_PATH, "users", userId, "files", bucket);
  if (!fs.existsSync(bucketDir)) {
    fs.mkdirSync(bucketDir, { recursive: true });
  }
  const ext = extension && !extension.startsWith(".") ? `.${extension}` : extension;
  return path.join(bucketDir, `${fileId}${ext}`);
}

/**
 * Temp directory for in-progress chunked uploads.
 * Lives at users/<id>/.chunks — NOT inside files/.
 * @param {string} userId
 * @returns {string}
 */
function getChunksDir(userId) {
  const chunksDir = path.join(config.NAS_STORAGE_PATH, "users", userId, ".chunks");
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }
  return chunksDir;
}

/**
 * Directory for cached thumbnail images.
 * @param {string} userId
 * @returns {string}
 */
function getThumbnailDir(userId) {
  const thumbDir = path.join(config.NAS_STORAGE_PATH, "users", userId, "thumbnails");
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }
  return thumbDir;
}

// ─── Quota ────────────────────────────────────────────────────────────────────

/**
 * Check if user has enough quota for incoming file size.
 * @param {string} userId
 * @param {number} incomingBytes
 * @returns {Promise<boolean>}
 */
async function checkQuota(userId, incomingBytes) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user.used_bytes + incomingBytes <= user.quota_bytes;
}

// ─── Filename Uniqueness ──────────────────────────────────────────────────────

/**
 * Ensure the display name (stored in DB) is unique within a folder.
 * The physical path is always <fileId>.<ext> — this only affects DB `name`.
 *
 * @param {string} userId
 * @param {string|null} folderId
 * @param {string} originalName
 * @returns {Promise<string>}
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

// ─── Copy ─────────────────────────────────────────────────────────────────────

/**
 * Internal helper to copy a single file.
 * The copy gets its own stable physical path based on its new DB ObjectId.
 */
async function copyFileInternal(userId, fileId, targetFolderId) {
  const sourceFile = await File.findOne({ _id: fileId, user: userId });
  if (!sourceFile) {
    return;
  }

  const uniqueName = await getUniqueFilename(userId, targetFolderId, sourceFile.original_name);
  const ext = path.extname(sourceFile.original_name);

  // Create the DB record first to get a stable _id
  const newFileData = sourceFile.toObject();
  delete newFileData._id;
  delete newFileData.createdAt;
  delete newFileData.updatedAt;

  // Temp placeholder — we update storage_path right after
  const newFile = await File.create({
    ...newFileData,
    name: uniqueName,
    folder: targetFolderId || null,
    storage_path: "pending",
    thumbnail_path: null,
  });

  const newPath = getPhysicalFilePath(userId, newFile._id.toString(), ext);

  // Copy physical file
  if (fs.existsSync(sourceFile.storage_path)) {
    fs.copyFileSync(sourceFile.storage_path, newPath);
  }

  newFile.storage_path = newPath;
  await newFile.save();

  return newFile;
}

/**
 * Internal helper to recursively copy a folder.
 */
async function copyFolderInternal(userId, folderId, targetFolderId) {
  const sourceFolder = await Folder.findOne({ _id: folderId, user: userId });
  if (!sourceFolder) {
    return;
  }

  const newFolder = await Folder.create({
    name: sourceFolder.name,
    user: userId,
    parent: targetFolderId || null,
    path: targetFolderId ? "child" : "/",
  });

  const files = await File.find({ folder: folderId, user: userId, is_deleted: false });
  for (const file of files) {
    await copyFileInternal(userId, file._id, newFolder._id);
  }

  const subfolders = await Folder.find({ parent: folderId, user: userId, is_deleted: false });
  for (const subfolder of subfolders) {
    await copyFolderInternal(userId, subfolder._id, newFolder._id);
  }

  return newFolder;
}

// ─── Bulk Operations ──────────────────────────────────────────────────────────

async function bulkMove(userId, items, targetFolderId) {
  for (const item of items) {
    if (item.type === "file") {
      await File.findOneAndUpdate({ _id: item.id, user: userId }, { folder: targetFolderId || null });
    } else if (item.type === "folder") {
      if (item.id === targetFolderId) {
        continue;
      }
      await Folder.findOneAndUpdate({ _id: item.id, user: userId }, { parent: targetFolderId || null });
    }
  }
}

async function bulkCopy(userId, items, targetFolderId) {
  for (const item of items) {
    if (item.type === "file") {
      await copyFileInternal(userId, item.id, targetFolderId);
    } else if (item.type === "folder") {
      await copyFolderInternal(userId, item.id, targetFolderId);
    }
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const FileService = {
  getUserDir,
  getPhysicalFilePath,
  getChunksDir,
  getThumbnailDir,

  checkQuota,
  getUniqueFilename,
  bulkMove,
  bulkCopy,
};

export default FileService;
