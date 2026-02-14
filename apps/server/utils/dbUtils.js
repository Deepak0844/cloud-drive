import fs from "fs";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

/**
 * Recursively marks an item and its descendants as deleted or restored
 */
async function softDeleteRecursive(type, id, userId, isDirect = true) {
  const updateData = {
    is_deleted: true,
    deleted_at: Date.now(),
    deleted_directly: isDirect,
  };

  if (type === "file") {
    await File.updateOne({ _id: id, user: userId }, updateData);
  } else {
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
      await softDeleteRecursive("folder", folder._id, userId, false);
    }
  }
}

/**
 * Recursively restores an item and its descendants
 * Only restores descendants that were NOT directly deleted themselves
 */
async function restoreRecursive(type, id, userId) {
  if (type === "file") {
    await File.updateOne({ _id: id, user: userId }, { is_deleted: false, deleted_at: null, deleted_directly: false });
  } else {
    await Folder.updateOne({ _id: id, user: userId }, { is_deleted: false, deleted_at: null, deleted_directly: false });

    // Restore files in this folder that were NOT deleted directly
    await File.updateMany(
      { folder: id, user: userId, deleted_directly: false },
      { is_deleted: false, deleted_at: null }
    );

    // Recurse subfolders that were NOT deleted directly
    const subFolders = await Folder.find({ parent: id, user: userId, deleted_directly: false });
    for (const folder of subFolders) {
      await restoreRecursive("folder", folder._id, userId);
    }
  }
}

/**
 * Recursively deletes items and their physical files
 */
async function permanentDeleteRecursive(type, id, userId) {
  if (type === "file") {
    const file = await File.findOne({ _id: id, user: userId });
    if (file) {
      if (fs.existsSync(file.storage_path)) {
        try {
          fs.unlinkSync(file.storage_path);
        } catch (e) {
          console.error(e);
        }
      }
      if (file.thumbnail_path && fs.existsSync(file.thumbnail_path)) {
        try {
          fs.unlinkSync(file.thumbnail_path);
        } catch (e) {
          console.error(e);
        }
      }

      const user = await User.findById(userId);
      if (user) {
        user.used_bytes = Math.max(0, user.used_bytes - file.size_bytes);
        await user.save();
      }

      await file.deleteOne();
    }
  } else {
    // 1. Delete all files in this folder
    const files = await File.find({ folder: id, user: userId });
    for (const file of files) {
      await permanentDeleteRecursive("file", file._id, userId);
    }

    // 2. Delete all subfolders recursively
    const subFolders = await Folder.find({ parent: id, user: userId });
    for (const folder of subFolders) {
      await permanentDeleteRecursive("folder", folder._id, userId);
    }

    // 3. Delete the folder itself
    await Folder.deleteOne({ _id: id, user: userId });
  }
}

// Exports
// -----------------------------------------------
const DbUtils = {
  softDeleteRecursive,
  restoreRecursive,
  permanentDeleteRecursive,
};

export default DbUtils;
