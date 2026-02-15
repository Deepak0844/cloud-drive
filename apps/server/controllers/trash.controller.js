// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";

// Utils
import DbUtils from "../utils/dbUtils.js";
import ResponseHelper from "../utils/responseHelper.js";

// Constants
import StatusCodes from "../constants/statusCodes.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

/**
 * @desc    Get all trashed items
 * @route   GET /api/v1/trash
 * @access  Private
 */
export const getTrashedItems = asyncHandler(async (req, res) => {
  const query = {
    user: req.user.id,
    is_deleted: true,
    $or: [{ deleted_directly: true }, { deleted_directly: { $exists: false } }],
  };

  const files = await File.find(query);
  const folders = await Folder.find(query);

  const items = [
    ...folders.map((f) => ({ ...f.toObject(), type: "folder", mime_type: null })),
    ...files.map((f) => ({ ...f.toObject(), type: "file" })),
  ];

  items.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

  return ResponseHelper.success(res, items, StatusCodes.OK, { count: items.length });
});

/**
 * @desc    Restore item from trash
 * @route   POST /api/v1/trash/:id/restore
 * @access  Private
 */
export const restoreItem = asyncHandler(async (req, res) => {
  let type = "file";
  let item = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!item) {
    item = await Folder.findOne({ _id: req.params.id, user: req.user.id });
    type = "folder";
  }

  if (!item) {
    return ResponseHelper.error(res, "Item not found", StatusCodes.NOT_FOUND);
  }

  await DbUtils.restoreRecursive(type, req.params.id, req.user.id, true);

  return ResponseHelper.success(res, item);
});

/**
 * @desc    Permanently delete item
 * @route   DELETE /api/v1/trash/:id
 * @access  Private
 */
export const deletePermanently = asyncHandler(async (req, res) => {
  let type = "file";
  let item = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!item) {
    item = await Folder.findOne({ _id: req.params.id, user: req.user.id });
    type = "folder";
  }

  if (!item) {
    return ResponseHelper.error(res, "Item not found", StatusCodes.NOT_FOUND);
  }

  await DbUtils.permanentDeleteRecursive(type, req.params.id, req.user.id);

  return ResponseHelper.success(res, {});
});

/**
 * @desc    Empty trash
 * @route   DELETE /api/v1/trash/empty
 * @access  Private
 */
export const emptyTrash = asyncHandler(async (req, res) => {
  const files = await File.find({ user: req.user.id, is_deleted: true });
  const folders = await Folder.find({ user: req.user.id, is_deleted: true, deleted_directly: true });

  for (const file of files) {
    await DbUtils.permanentDeleteRecursive("file", file._id, req.user.id);
  }

  for (const folder of folders) {
    await DbUtils.permanentDeleteRecursive("folder", folder._id, req.user.id);
  }

  return ResponseHelper.success(res, { message: "Trash emptied successfully" });
});
