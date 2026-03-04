// Native modules
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Config
import config from "../config/env.js";

// Constants
import { NotificationTypes } from "../constants/generalConstants.js";

// Utils
import logger from "../utils/logger.js";
import FormatUtils from "../utils/formatUtils.js";

// ─── Circular-dependency-safe lazy import ────────────────────────────────────
// notification.controller.js <-> file.service.js would be circular if imported
// at module level, so we use a dynamic import inside the function body.
async function _createNotification(...args) {
  const { createNotification } = await import("../controllers/notification.controller.js");
  return createNotification(...args);
}

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

/**
 * Recalculates and synchronizes the used_bytes field for a user based on their actual files.
 * This is a self-healing utility to fix any drift caused by historical bugs.
 * @param {string} userId
 */
async function recalculateUsedBytes(userId) {
  // Read current usage before updating (to detect threshold crossings)
  const userBefore = await User.findById(userId).select("used_bytes quota_bytes");

  const result = await File.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), is_deleted: false } },
    { $group: { _id: null, total: { $sum: "$size_bytes" } } },
  ]);

  const totalUsed = result.length > 0 ? result[0].total : 0;
  await User.findByIdAndUpdate(userId, { used_bytes: totalUsed });

  // ── Storage alert at 80% threshold ──────────────────────────────────────────
  if (userBefore && userBefore.quota_bytes > 0) {
    const prevPercent = (userBefore.used_bytes / userBefore.quota_bytes) * 100;
    const newPercent = (totalUsed / userBefore.quota_bytes) * 100;
    const THRESHOLD = 80;

    // Only notify on the crossing (was below, now at or above)
    if (prevPercent < THRESHOLD && newPercent >= THRESHOLD) {
      const usedPct = newPercent.toFixed(1);
      _createNotification(
        userId,
        NotificationTypes.STORAGE_ALERT,
        "Storage Almost Full",
        `You've used ${usedPct}% of your storage quota. Consider requesting a quota increase or freeing up space.`,
        {
          usedPercentage: usedPct,
          totalQuota: FormatUtils.formatStorageSize(userBefore.quota_bytes),
        }
      ).catch((err) => logger.error("[StorageAlert] Failed to send storage alert:", err));
    }
  }

  return totalUsed;
}

/**
 * Perform a deep scan of the physical storage and synchronize it with the database.
 * 1. Scans all user storage directories.
 * 2. Matches physical files to DB records.
 * 3. Updates size discrepancies.
 * 4. Identifies orphaned DB records (physical file missing).
 * 5. Syncs quota totals.
 */
async function deepSyncStorage(specificUserId = null) {
  logger.info(`[StorageSync] Starting deep storage analysis${specificUserId ? ` for user ${specificUserId}` : ""}...`);
  const startTime = Date.now();
  const summary = {
    users_processed: 0,
    files_checked: 0,
    size_discrepancies_fixed: 0,
    orphans_identified: 0,
    total_size_synced: 0,
  };

  const usersDir = path.join(config.NAS_STORAGE_PATH, "users");
  if (!fs.existsSync(usersDir)) {
    logger.warn("[StorageSync] No users directory found at NAS_STORAGE_PATH");
    return summary;
  }

  const userIds = specificUserId
    ? [specificUserId]
    : fs.readdirSync(usersDir).filter((id) => id.match(/^[0-9a-fA-F]{24}$/));

  summary.users_processed = userIds.length;

  for (const userId of userIds) {
    // Validate userId before processing
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn(`[StorageSync] Skipping invalid userId: ${userId}`);
      continue;
    }

    const userFilesDir = path.join(usersDir, userId, "files");
    const seenFileIds = new Set();

    if (fs.existsSync(userFilesDir)) {
      const physicalFilePaths = [];
      // Recursively find all files in the buckets
      try {
        const buckets = fs.readdirSync(userFilesDir);
        for (const bucket of buckets) {
          const bucketDir = path.join(userFilesDir, bucket);
          if (!fs.statSync(bucketDir).isDirectory()) {
            continue;
          }

          const filesInBucket = fs.readdirSync(bucketDir);
          for (const fileName of filesInBucket) {
            physicalFilePaths.push(path.join(bucketDir, fileName));
          }
        }

        for (const filePath of physicalFilePaths) {
          summary.files_checked++;
          const fileParsed = path.parse(filePath);
          const fileIdStr = fileParsed.name;

          if (fileParsed.base.startsWith(".") || fileParsed.base.startsWith("._")) {
            continue;
          }

          if (!mongoose.Types.ObjectId.isValid(fileIdStr)) {
            continue;
          }

          const fileRecord = await File.findOne({ _id: fileIdStr, user: userId });
          if (fileRecord) {
            seenFileIds.add(fileRecord._id.toString());
            const stats = fs.statSync(filePath);
            if (fileRecord.size_bytes !== stats.size) {
              logger.info(
                `[StorageSync] Size mismatch fixed for user ${userId}: ${fileRecord.name} (${fileIdStr}). DB: ${fileRecord.size_bytes}, Disk: ${stats.size}`
              );
              fileRecord.size_bytes = stats.size;
              summary.size_discrepancies_fixed++;
            }
            fileRecord.storage_path = filePath;
            fileRecord.is_orphaned = false;
            await fileRecord.save();
            summary.total_size_synced += stats.size;
          }
        }
      } catch (err) {
        logger.error(`[StorageSync] Error scanning directory for user ${userId}: ${err.message}`);
      }
    }

    // Mark DB records not seen on disk as orphaned
    const orphansToMark = await File.find({
      user: userId,
      _id: { $nin: Array.from(seenFileIds).map((id) => new mongoose.Types.ObjectId(id)) },
      is_orphaned: false,
      is_deleted: false,
    });

    if (orphansToMark.length > 0) {
      for (const orphan of orphansToMark) {
        logger.warn(`[StorageSync] Marking file as orphaned for user ${userId}: ${orphan.name} (${orphan._id})`);
        orphan.is_orphaned = true;
        await orphan.save();
      }
      summary.orphans_identified += orphansToMark.length;
    }

    // Finally recalculate used_bytes for this user
    await recalculateUsedBytes(userId);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`[StorageSync] Finished deep scan in ${duration}s. Summary: ${JSON.stringify(summary)}`);
  return summary;
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

  // Update user quota atomically
  await User.findByIdAndUpdate(userId, { $inc: { used_bytes: sourceFile.size_bytes } });

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
  recalculateUsedBytes,
  deepSyncStorage,
  getUniqueFilename,
  bulkMove,
  bulkCopy,
};

export default FileService;
