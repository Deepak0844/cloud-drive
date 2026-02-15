// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";

// Services
import SocketService from "../services/socket.service.js";

// Utils
import DbUtils from "../utils/dbUtils.js";
import ResponseHelper from "../utils/responseHelper.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Schemas
import { bulkOperationSchema } from "../schemas/item.schema.js";

/**
 * @desc    Bulk operation on mixed items (delete/move)
 * @route   POST /api/v1/items/bulk-operation
 * @access  Private
 */
export const handleBulkOperation = asyncHandler(async (req, res) => {
  bulkOperationSchema.parse({ body: req.body });

  const { action, items, destination_folder_id } = req.body;
  const results = { success: [], errors: [] };

  for (const item of items) {
    const { type, id } = item;
    try {
      if (action === "delete") {
        await DbUtils.softDeleteRecursive(type, id, req.user.id, true);
      } else if (action === "move") {
        if (type === "file") {
          await File.findOneAndUpdate({ _id: id, user: req.user.id }, { folder: destination_folder_id || null });
        } else {
          await Folder.findOneAndUpdate({ _id: id, user: req.user.id }, { parent: destination_folder_id || null });
        }
      }
      results.success.push(id);
    } catch (err) {
      results.errors.push({ id, error: err.message });
    }
  }

  // Emit socket event
  SocketService.emitToUser(String(req.user.id), "ITEM_BULK_CHANGE", {
    action,
    items,
    destination_folder_id,
  });

  return ResponseHelper.success(res, results);
});
