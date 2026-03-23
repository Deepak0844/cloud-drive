// Services
import TrashService from "#services/trashService.js";
import SocketService from "#services/socketService.js";

// Constants
import { HttpStatus } from "@shared-constants/constants";
import { ErrorMessages, SuccessMessages, SocketEvents, SocketActions } from "#constants/generalConstants.js";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

/**
 * @desc    Get all files and folders currently in the trash
 * @route   GET /api/v1/trash
 * @access  Private
 */
export const getTrashItems = asyncHandler(async (req, res) => {
  const result = await TrashService.getTrashItems(req.user.id, req.query);
  return ResponseUtils.success(res, result);
});

/**
 * @desc    Restore specific files/folders from the trash
 * @route   POST /api/v1/trash/restore
 * @access  Private
 */
export const restoreItems = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ResponseUtils.error(res, ErrorMessages.BAD_REQUEST, HttpStatus.BAD_REQUEST);
  }

  await TrashService.restoreItems(req.user.id, items);

  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, { action: SocketActions.RESTORE, items });
  return ResponseUtils.success(res, { message: SuccessMessages.ITEMS_RESTORED });
});

/**
 * @desc    Permanently delete specific files/folders
 * @route   DELETE /api/v1/trash/permanent
 * @access  Private
 */
export const deleteItemsPermanently = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return ResponseUtils.error(res, ErrorMessages.BAD_REQUEST, HttpStatus.BAD_REQUEST);
  }

  await TrashService.deleteItemsPermanently(req.user.id, items);

  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, { action: SocketActions.PERMANENT_DELETE, items });
  return ResponseUtils.success(res, { message: SuccessMessages.ITEMS_PERMANENTLY_DELETED });
});

/**
 * @desc    Empty the entire trash (permanently delete all trashed items)
 * @route   DELETE /api/v1/trash/empty
 * @access  Private
 */
export const emptyTrash = asyncHandler(async (req, res) => {
  const hadItems = await TrashService.emptyTrash(req.user.id);

  if (!hadItems) {
    return ResponseUtils.success(res, { message: SuccessMessages.TRASH_ALREADY_EMPTY });
  }

  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, { action: SocketActions.EMPTY_TRASH });
  return ResponseUtils.success(res, { message: SuccessMessages.TRASH_EMPTIED });
});
