import fs from "fs";
import path from "path";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";

// Constants
import { ItemTypes, ErrorMessages } from "../constants/generalConstants.js";

// Utils
import logger from "./logger.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely remove a file from disk if it exists
 */
function safeUnlink(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      logger.error(`Failed to unlink file: ${filePath}`, e.message);
    }
  }
}

/**
 * Check if targetFolderId is a descendant of folderId (to prevent circular moves)
 */
async function isDescendant(folderId, targetFolderId, userId) {
  if (!targetFolderId) {
    return false;
  }
  if (String(folderId) === String(targetFolderId)) {
    return true;
  }

  let current = await Folder.findOne({ _id: targetFolderId, user: userId });
  while (current && current.parent) {
    if (String(current.parent) === String(folderId)) {
      return true;
    }
    current = await Folder.findOne({ _id: current.parent, user: userId });
  }
  return false;
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Recursively marks an item and its descendants as deleted or restored.
 * Uses updateMany for bulk performance at each folder level.
 */
async function softDeleteRecursive(type, id, userId, isDirect = true) {
  const model = type === ItemTypes.FILE ? File : Folder;
  const item = await model.findOne({ _id: id, user: userId });

  if (!item) {
    return;
  }

  const updateData = {
    is_deleted: true,
    deleted_at: Date.now(),
    deleted_directly: isDirect,
    original_parent: type === ItemTypes.FILE ? item.folder : item.parent,
  };

  await model.updateOne({ _id: id, user: userId }, updateData);

  if (type === ItemTypes.FOLDER) {
    // Bulk-mark all files in this folder as deleted (not directly)
    await File.updateMany(
      { folder: id, user: userId, is_deleted: false },
      { is_deleted: true, deleted_at: Date.now(), deleted_directly: false }
    );

    // Recurse into subfolders
    const subFolders = await Folder.find({ parent: id, user: userId, is_deleted: false });
    for (const folder of subFolders) {
      await softDeleteRecursive(ItemTypes.FOLDER, folder._id, userId, false);
    }
  }
}

// ─── Restore ─────────────────────────────────────────────────────────────────

/**
 * Recursively restores an item and its descendants
 */
async function restoreRecursive(type, id, userId) {
  const model = type === ItemTypes.FILE ? File : Folder;
  const item = await model.findOne({ _id: id, user: userId });

  if (!item) {
    return;
  }

  let newParent = null;
  if (item.original_parent) {
    const parentFolder = await Folder.findOne({ _id: item.original_parent, user: userId, is_deleted: false });
    if (parentFolder) {
      newParent = item.original_parent;
    }
  }

  const updateData = {
    is_deleted: false,
    deleted_at: null,
    deleted_directly: false,
  };

  if (type === ItemTypes.FILE) {
    updateData.folder = newParent;
  } else {
    updateData.parent = newParent;
  }

  await model.updateOne({ _id: id, user: userId }, updateData);

  if (type === ItemTypes.FOLDER) {
    // Bulk-restore files that were NOT deleted directly
    await File.updateMany(
      { folder: id, user: userId, deleted_directly: false },
      { is_deleted: false, deleted_at: null }
    );

    // Recurse subfolders that were NOT deleted directly
    const subFolders = await Folder.find({ parent: id, user: userId, deleted_directly: false });
    for (const folder of subFolders) {
      await restoreRecursive(ItemTypes.FOLDER, folder._id, userId);
    }
  }
}

// ─── Permanent Delete ─────────────────────────────────────────────────────────

/**
 * Recursively deletes items and all associated physical files (storage, thumbnail, preview, HLS).
 */
async function permanentDeleteRecursive(type, id, userId) {
  if (type === ItemTypes.FILE) {
    const file = await File.findOne({ _id: id, user: userId });
    if (file) {
      // Remove all physical files associated with this record
      safeUnlink(file.storage_path);
      safeUnlink(file.thumbnail_path);

      // Update user quota atomically
      await User.findByIdAndUpdate(userId, {
        $inc: { used_bytes: -file.size_bytes },
      });
      // Safety check: ensure used_bytes doesn't go below 0
      await User.findOneAndUpdate({ _id: userId, used_bytes: { $lt: 0 } }, { used_bytes: 0 });

      await file.deleteOne();
    }
  } else if (type === ItemTypes.FOLDER) {
    // 1. Delete all files in this folder
    const files = await File.find({ folder: id, user: userId });
    for (const file of files) {
      await permanentDeleteRecursive(ItemTypes.FILE, file._id, userId);
    }

    // 2. Delete all subfolders recursively
    const subFolders = await Folder.find({ parent: id, user: userId });
    for (const folder of subFolders) {
      await permanentDeleteRecursive(ItemTypes.FOLDER, folder._id, userId);
    }

    // 3. Delete the folder record itself
    await Folder.deleteOne({ _id: id, user: userId });
  }
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

/**
 * Recursively copies an item and its descendants
 */
async function copyRecursive(type, id, targetFolderId, userId) {
  if (type === ItemTypes.FILE) {
    const sourceFile = await File.findOne({ _id: id, user: userId });
    if (!sourceFile) {
      return;
    }

    // Check quota
    const canUpload = await FileService.checkQuota(userId, sourceFile.size_bytes);
    if (!canUpload) {
      throw new Error(ErrorMessages.QUOTA_EXCEEDED);
    }

    const uniqueName = await FileService.getUniqueFilename(userId, targetFolderId, sourceFile.original_name);
    const ext = sourceFile.extension ? `.${sourceFile.extension}` : "";

    // Create DB record first to get a stable _id for the bucketed path
    const newFile = await File.create({
      user: userId,
      folder: targetFolderId || null,
      name: uniqueName,
      original_name: sourceFile.original_name,
      mime_type: sourceFile.mime_type,
      extension: sourceFile.extension,
      category: sourceFile.category,
      size_bytes: sourceFile.size_bytes,
      storage_path: "pending",
      tags: sourceFile.tags,
      metadata: sourceFile.metadata,
    });

    const newStoragePath = FileService.getPhysicalFilePath(userId, newFile._id.toString(), ext);

    // Physical copy
    if (fs.existsSync(sourceFile.storage_path)) {
      fs.copyFileSync(sourceFile.storage_path, newStoragePath);
    }

    newFile.storage_path = newStoragePath;

    // Update user quota atomically
    await User.findByIdAndUpdate(userId, { $inc: { used_bytes: sourceFile.size_bytes } });

    // Copy thumbnail if exists
    if (sourceFile.thumbnail_path && fs.existsSync(sourceFile.thumbnail_path)) {
      const thumbDir = FileService.getThumbnailDir(userId);
      const newThumbPath = path.join(thumbDir, `${newFile._id}.jpg`);
      fs.copyFileSync(sourceFile.thumbnail_path, newThumbPath);
      newFile.thumbnail_path = newThumbPath;
    }

    // Always save — storage_path changed from "pending" and thumbnail may have been set
    await newFile.save();

    return newFile;
  } else if (type === ItemTypes.FOLDER) {
    const sourceFolder = await Folder.findOne({ _id: id, user: userId });
    if (!sourceFolder) {
      return;
    }

    // Prevent copying a folder into itself or its own descendant
    if (await isDescendant(id, targetFolderId, userId)) {
      throw new Error(ErrorMessages.INVALID_MOVE);
    }

    // Create new folder
    const newFolder = await Folder.create({
      user: userId,
      name: `${sourceFolder.name} (Copy)`,
      parent: targetFolderId || null,
      path: sourceFolder.path,
    });

    // Copy sub-files
    const subFiles = await File.find({ folder: id, user: userId, is_deleted: false });
    for (const file of subFiles) {
      await copyRecursive(ItemTypes.FILE, file._id, newFolder._id, userId);
    }

    // Copy sub-folders
    const subFolders = await Folder.find({ parent: id, user: userId, is_deleted: false });
    for (const folder of subFolders) {
      await copyRecursive(ItemTypes.FOLDER, folder._id, newFolder._id, userId);
    }

    return newFolder;
  }
}

// ─── Move ─────────────────────────────────────────────────────────────────────

/**
 * Moves an item to a new folder.
 * Prevents circular folder moves by checking the full ancestor chain.
 */
async function moveItem(type, id, targetFolderId, userId) {
  if (type === ItemTypes.FILE) {
    const file = await File.findOneAndUpdate(
      { _id: id, user: userId },
      { folder: targetFolderId || null },
      { new: true }
    );
    return file;
  } else if (type === ItemTypes.FOLDER) {
    // Prevent moving into itself or any of its own descendants
    if (await isDescendant(id, targetFolderId, userId)) {
      throw new Error(ErrorMessages.INVALID_MOVE);
    }
    const folder = await Folder.findOneAndUpdate(
      { _id: id, user: userId },
      { parent: targetFolderId || null },
      { new: true }
    );
    return folder;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const DbUtils = {
  softDeleteRecursive,
  restoreRecursive,
  permanentDeleteRecursive,
  copyRecursive,
  moveItem,
};

export default DbUtils;
