// Utils
import DbUtils from "../utils/dbUtils.js";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";

/**
 * @desc    Get all trashed items
 * @route   GET /api/v1/trash
 * @access  Private
 */
export async function getTrashedItems(req, res) {
  try {
    // Only show items that were deleted directly by the user
    // Include items where deleted_directly is not set (legacy items)
    const query = {
      user: req.user.id,
      is_deleted: true,
      $or: [{ deleted_directly: true }, { deleted_directly: { $exists: false } }],
    };

    const files = await File.find(query);
    const folders = await Folder.find(query);

    // Combine and format
    const items = [
      ...folders.map((f) => ({ ...f.toObject(), type: "folder", mime_type: null })),
      ...files.map((f) => ({ ...f.toObject(), type: "file" })),
    ];

    // Sort by deleted_at desc
    items.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

    res.status(StatusCodes.OK).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
    console.error("Error getting trashed items:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Restore item from trash
 * @route   POST /api/v1/trash/:id/restore
 * @access  Private
 */
export async function restoreItem(req, res) {
  try {
    // Try finding file first to determine type
    let type = "file";
    let item = await File.findOne({ _id: req.params.id, user: req.user.id });

    if (!item) {
      item = await Folder.findOne({ _id: req.params.id, user: req.user.id });
      type = "folder";
    }

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: "Item not found",
      });
    }

    await DbUtils.restoreRecursive(type, req.params.id, req.user.id, true);

    res.status(StatusCodes.OK).json({
      success: true,
      data: item,
    });
  } catch (err) {
    console.error("Error restoring item:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Permanently delete item
 * @route   DELETE /api/v1/trash/:id
 * @access  Private
 */
export async function deletePermanently(req, res) {
  try {
    let type = "file";
    let item = await File.findOne({ _id: req.params.id, user: req.user.id });

    if (!item) {
      item = await Folder.findOne({ _id: req.params.id, user: req.user.id });
      type = "folder";
    }

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: "Item not found",
      });
    }

    await DbUtils.permanentDeleteRecursive(type, req.params.id, req.user.id);

    res.status(StatusCodes.OK).json({ success: true, data: {} });
  } catch (err) {
    console.error("Error deleting item permanently:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Empty trash
 * @route   DELETE /api/v1/trash/empty
 * @access  Private
 */
export async function emptyTrash(req, res) {
  try {
    const files = await File.find({ user: req.user.id, is_deleted: true });
    const folders = await Folder.find({ user: req.user.id, is_deleted: true, deleted_directly: true });

    // Delete files first
    for (const file of files) {
      await DbUtils.permanentDeleteRecursive("file", file._id, req.user.id);
    }

    // Delete folder trees
    for (const folder of folders) {
      await DbUtils.permanentDeleteRecursive("folder", folder._id, req.user.id);
    }

    res.status(StatusCodes.OK).json({ success: true, data: {} });
  } catch (err) {
    console.error("Error emptying trash:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}
