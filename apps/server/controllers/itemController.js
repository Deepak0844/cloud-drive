// Utils
import ResponseUtils from "#utils/responseUtils.js";
import DbUtils from "#utils/dbUtils.js";

// Services
import SocketService from "#services/socketService.js";

// Constants
import { SocketEvents, BulkActions } from "#constants/generalConstants.js";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

/**
 * @desc    Handle bulk operations (delete, restore, permanent delete, move, copy)
 * @route   POST /api/v1/items/bulk-operation
 * @access  Private
 */
export const handleBulkOperation = asyncHandler(async (req, res) => {
  const { action, items, destination_folder_id } = req.body;

  const results = {
    success: [],
    errors: [],
  };

  for (const item of items) {
    const { id, type } = item;

    try {
      if (action === BulkActions.DELETE) {
        await DbUtils.softDeleteRecursive(type, id, req.user.id, true);
      } else if (action === BulkActions.RESTORE) {
        await DbUtils.restoreRecursive(type, id, req.user.id);
      } else if (action === BulkActions.PERMANENT_DELETE) {
        await DbUtils.permanentDeleteRecursive(type, id, req.user.id);
      } else if (action === BulkActions.MOVE) {
        await DbUtils.moveItem(type, id, destination_folder_id, req.user.id);
      } else if (action === BulkActions.COPY) {
        await DbUtils.copyRecursive(type, id, destination_folder_id, req.user.id);
      }
      results.success.push(id);
    } catch (err) {
      results.errors.push({ id, error: err.message });
    }
  }

  // Emit socket event for real-time updates
  SocketService.emitToUser(String(req.user.id), SocketEvents.ITEM_BULK_CHANGE || "ITEM_BULK_CHANGE", {
    action,
    items,
    destination_folder_id,
  });

  return ResponseUtils.success(res, results);
});
