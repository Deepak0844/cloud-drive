import asyncHandler from "../middleware/asyncHandler.js";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";

// Constants
import { StatusCodes, ItemTypes } from "../constants/generalConstants.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import DbUtils from "../utils/dbUtils.js";

// Services
import SocketService from "../services/socket.service.js";

/**
 * @desc    Get all files and folders currently in the trash (only items deleted directly)
 * @route   GET /api/v1/trash
 * @access  Private
 */
export const getTrashItems = asyncHandler(async (req, res) => {
  // We only fetch items that were `deleted_directly` by the user.
  // Items deleted because their parent folder was deleted will NOT be shown at the root of the trash.
  const folders = await Folder.find({ user: req.user.id, is_deleted: true, deleted_directly: true }).sort(
    "-deleted_at"
  );
  const files = await File.find({ user: req.user.id, is_deleted: true, deleted_directly: true }).sort("-deleted_at");

  return ResponseHelper.success(res, { folders, files });
});

/**
 * @desc    Restore specific files/folders from the trash
 * @route   POST /api/v1/trash/restore
 * @access  Private
 */
export const restoreItems = asyncHandler(async (req, res) => {
  const { items } = req.body; // Expects array of { id, type }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ResponseHelper.error(res, "No items provided for restoration", StatusCodes.BAD_REQUEST);
  }

  for (const item of items) {
    if (!item.id || !item.type) {
      continue;
    }

    // DbUtils.restoreRecursive handles moving items back to original_parent (if it exists and is not deleted),
    // otherwise restores to root. It also restores all children.
    await DbUtils.restoreRecursive(item.type, item.id, req.user.id);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "RESTORE", items });
  return ResponseHelper.success(res, { message: "Items restored successfully" });
});

/**
 * @desc    Permanently delete specific files/folders
 * @route   DELETE /api/v1/trash/permanent
 * @access  Private
 */
export const deleteItemsPermanently = asyncHandler(async (req, res) => {
  const { items } = req.body; // Expects array of { id, type }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ResponseHelper.error(res, "No items provided for deletion", StatusCodes.BAD_REQUEST);
  }

  for (const item of items) {
    if (!item.id || !item.type) {
      continue;
    }

    // DbUtils.permanentDeleteRecursive deletes records from MongoDB and unlinks physical storage files
    await DbUtils.permanentDeleteRecursive(item.type, item.id, req.user.id);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "PERMANENT_DELETE", items });
  return ResponseHelper.success(res, { message: "Items permanently deleted" });
});

/**
 * @desc    Empty the entire trash (permanently delete all trashed items)
 * @route   DELETE /api/v1/trash/empty
 * @access  Private
 */
export const emptyTrash = asyncHandler(async (req, res) => {
  // Find all directly deleted folders and files
  const folders = await Folder.find({ user: req.user.id, is_deleted: true, deleted_directly: true });
  const files = await File.find({ user: req.user.id, is_deleted: true, deleted_directly: true });

  const itemsToDelete = [
    ...folders.map((f) => ({ id: f._id, type: ItemTypes.FOLDER })),
    ...files.map((f) => ({ id: f._id, type: ItemTypes.FILE })),
  ];

  if (itemsToDelete.length === 0) {
    return ResponseHelper.success(res, { message: "Trash is already empty" });
  }

  for (const item of itemsToDelete) {
    await DbUtils.permanentDeleteRecursive(item.type, item.id, req.user.id);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "EMPTY_TRASH" });
  return ResponseHelper.success(res, { message: "Trash emptied successfully" });
});
