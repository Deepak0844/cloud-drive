// Models
import File from "#models/File.js";
import Folder from "#models/Folder.js";

// Constants
import { HttpStatus, ItemTypes } from "@shared-constants/constants";
import { ErrorMessages, SuccessMessages, SocketEvents, SocketActions } from "#constants/generalConstants.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import DbUtils from "#utils/dbUtils.js";
import { applyAdvancedFilters } from "#utils/filterUtils.js";
import { paginateQuery } from "#utils/paginationUtils.js";

// Services
import SocketService from "#services/socketService.js";

// Middlewares
import asyncHandler from "#middlewares/asyncHandler.js";

/**
 * @desc    Get all files and folders currently in the trash (only items deleted directly)
 * @route   GET /api/v1/trash
 * @access  Private
 */
export const getTrashItems = asyncHandler(async (req, res) => {
  const { search } = req.query;

  let folderQuery = { user: req.user.id, is_deleted: true, deleted_directly: true };
  if (search && search !== "null" && search !== "undefined") {
    folderQuery.name = { $regex: search, $options: "i" };
  }
  folderQuery = applyAdvancedFilters(folderQuery, req.query, true);

  const fileQuery = { user: req.user.id, is_deleted: true, deleted_directly: true };
  if (search && search !== "null" && search !== "undefined") {
    fileQuery.name = { $regex: search, $options: "i" };
  }
  // We only fetch items that were `deleted_directly` by the user.
  // Items deleted because their parent folder was deleted will NOT be shown at the root of the trash.
  const fileQueryPaginated = applyAdvancedFilters({ ...fileQuery }, req.query, false);

  const { pg, ps } = req.query;

  const [folders, fileResult] = await Promise.all([
    Folder.find(folderQuery).sort("-deleted_at"),
    paginateQuery(File, fileQueryPaginated, { pg, ps, sort: "-deleted_at" }),
  ]);

  // Dynamically resolve itemCount for each folder in the trash
  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const fileCount = await File.countDocuments({ folder: folder._id, is_deleted: true });
      const subfolderCount = await Folder.countDocuments({ parent: folder._id, is_deleted: true });
      return {
        ...folder.toObject(),
        id: folder._id,
        itemCount: fileCount + subfolderCount,
      };
    })
  );

  return ResponseUtils.success(res, {
    folders: foldersWithCount,
    files: fileResult.data,
    pagination: fileResult.pagination,
  });
});

/**
 * @desc    Restore specific files/folders from the trash
 * @route   POST /api/v1/trash/restore
 * @access  Private
 */
export const restoreItems = asyncHandler(async (req, res) => {
  const { items } = req.body; // Expects array of { id, type }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ResponseUtils.error(res, ErrorMessages.BAD_REQUEST, HttpStatus.BAD_REQUEST);
  }

  for (const item of items) {
    if (!item.id || !item.type) {
      continue;
    }

    // DbUtils.restoreRecursive handles moving items back to original_parent (if it exists and is not deleted),
    // otherwise restores to root. It also restores all children.
    await DbUtils.restoreRecursive(item.type, item.id, req.user.id);
  }

  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, { action: SocketActions.RESTORE, items });
  return ResponseUtils.success(res, { message: SuccessMessages.ITEMS_RESTORED });
});

/**
 * @desc    Permanently delete specific files/folders
 * @route   DELETE /api/v1/trash/permanent
 * @access  Private
 */
export const deleteItemsPermanently = asyncHandler(async (req, res) => {
  const { items } = req.body; // Expects array of { id, type }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ResponseUtils.error(res, ErrorMessages.BAD_REQUEST, HttpStatus.BAD_REQUEST);
  }

  for (const item of items) {
    if (!item.id || !item.type) {
      continue;
    }

    // DbUtils.permanentDeleteRecursive deletes records from MongoDB and unlinks physical storage files
    await DbUtils.permanentDeleteRecursive(item.type, item.id, req.user.id);
  }

  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, { action: SocketActions.PERMANENT_DELETE, items });
  return ResponseUtils.success(res, { message: SuccessMessages.ITEMS_PERMANENTLY_DELETED });
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
    return ResponseUtils.success(res, { message: SuccessMessages.TRASH_ALREADY_EMPTY });
  }

  for (const item of itemsToDelete) {
    await DbUtils.permanentDeleteRecursive(item.type, item.id, req.user.id);
  }

  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, { action: SocketActions.EMPTY_TRASH });
  return ResponseUtils.success(res, { message: SuccessMessages.TRASH_EMPTIED });
});
