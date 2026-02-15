// Native modules
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

/**
 * Recursively marks an item and its descendants as deleted or restored
 * @param {string} type - Item type (file/folder)
 * @param {string} id - Item ID
 * @param {string} userId - User ID
 * @param {boolean} isDirect - Whether this item was directly deleted
 */
async function softDeleteRecursive(type, id, userId, isDirect = true) {
  const updateData = {
    is_deleted: true,
    deleted_at: Date.now(),
    deleted_directly: isDirect,
  };

  if (type === ItemTypes.FILE) {
    await File.updateOne({ _id: id, user: userId }, updateData);
  } else if (type === ItemTypes.FOLDER) {
    await Folder.updateOne({ _id: id, user: userId }, updateData);

    // Find immediate children to recurse
    const subFiles = await File.find({ folder: id, user: userId });
    const subFolders = await Folder.find({ parent: id, user: userId });

    // Mark direct files as deleted (not directly)
    if (subFiles.length > 0) {
      await File.updateMany(
        { folder: id, user: userId },
        { is_deleted: true, deleted_at: Date.now(), deleted_directly: false }
      );
    }

    // Recurse subfolders
    for (const folder of subFolders) {
      await softDeleteRecursive(ItemTypes.FOLDER, folder._id, userId, false);
    }
  }
}

/**
 * Recursively restores an item and its descendants
 * @param {string} type - Item type (file/folder)
 * @param {string} id - Item ID
 * @param {string} userId - User ID
 */
async function restoreRecursive(type, id, userId) {
  if (type === ItemTypes.FILE) {
    await File.updateOne({ _id: id, user: userId }, { is_deleted: false, deleted_at: null, deleted_directly: false });
  } else if (type === ItemTypes.FOLDER) {
    await Folder.updateOne({ _id: id, user: userId }, { is_deleted: false, deleted_at: null, deleted_directly: false });

    // Restore files in this folder that were NOT deleted directly
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

/**
 * Recursively deletes items and their physical files
 * @param {string} type - Item type (file/folder)
 * @param {string} id - Item ID
 * @param {string} userId - User ID
 */
async function permanentDeleteRecursive(type, id, userId) {
  if (type === ItemTypes.FILE) {
    const file = await File.findOne({ _id: id, user: userId });
    if (file) {
      if (fs.existsSync(file.storage_path)) {
        try {
          fs.unlinkSync(file.storage_path);
        } catch (e) {
          logger.error(`Failed to unlink storage path: ${file.storage_path}`, e);
        }
      }
      if (file.thumbnail_path && fs.existsSync(file.thumbnail_path)) {
        try {
          fs.unlinkSync(file.thumbnail_path);
        } catch (e) {
          logger.error(`Failed to unlink thumbnail path: ${file.thumbnail_path}`, e);
        }
      }

      const user = await User.findById(userId);
      if (user) {
        user.used_bytes = Math.max(0, user.used_bytes - file.size_bytes);
        await user.save();
      }

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

    // 3. Delete the folder itself
    await Folder.deleteOne({ _id: id, user: userId });
  }
}

/**
 * Recursively copies an item and its descendants
 * @param {string} type - Item type (file/folder)
 * @param {string} id - Item ID
 * @param {string} targetFolderId - Destination folder ID
 * @param {string} userId - User ID
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
    const userDir = FileService.getUserDir(userId);
    const newStoragePath = path.join(userDir, uniqueName);

    // Physical copy
    fs.copyFileSync(sourceFile.storage_path, newStoragePath);

    // Create record
    const newFile = await File.create({
      user: userId,
      folder: targetFolderId || null,
      name: uniqueName,
      original_name: sourceFile.original_name,
      mime_type: sourceFile.mime_type,
      size_bytes: sourceFile.size_bytes,
      storage_path: newStoragePath,
    });

    // Update user quota
    await User.findByIdAndUpdate(userId, { $inc: { used_bytes: sourceFile.size_bytes } });

    // Copy thumbnail/preview if exists
    if (sourceFile.thumbnail_path && fs.existsSync(sourceFile.thumbnail_path)) {
      const thumbDir = FileService.getThumbnailDir(userId);
      const newThumbPath = path.join(thumbDir, `${newFile._id}.jpg`);
      fs.copyFileSync(sourceFile.thumbnail_path, newThumbPath);
      newFile.thumbnail_path = newThumbPath;
      await newFile.save();
    }

    return newFile;
  } else if (type === ItemTypes.FOLDER) {
    const sourceFolder = await Folder.findOne({ _id: id, user: userId });
    if (!sourceFolder) {
      return;
    }

    // Prevent copying a folder into itself
    if (targetFolderId === id) {
      throw new Error("Cannot copy a folder into itself");
    }

    // Create new folder
    const newFolder = await Folder.create({
      user: userId,
      name: `${sourceFolder.name} (Copy)`,
      parent: targetFolderId || null,
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

/**
 * Moves an item to a new folder
 * @param {string} type - Item type (file/folder)
 * @param {string} id - Item ID
 * @param {string} targetFolderId - Destination folder ID
 * @param {string} userId - User ID
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
    // Prevent moving into itself
    if (targetFolderId === id) {
      throw new Error("Cannot move a folder into itself");
    }
    const folder = await Folder.findOneAndUpdate(
      { _id: id, user: userId },
      { parent: targetFolderId || null },
      { new: true }
    );
    return folder;
  }
}

// Exports
const DbUtils = {
  softDeleteRecursive,
  restoreRecursive,
  permanentDeleteRecursive,
  copyRecursive,
  moveItem,
};

export default DbUtils;
