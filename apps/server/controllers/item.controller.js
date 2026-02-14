// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";

// Utils
import DbUtils from "../utils/dbUtils.js";

// Constants
import StatusCodes from "../constants/statusCodes.js";
import ErrorMessages from "../constants/errorMessages.js";

// Services
import SocketService from "../services/socket.service.js";

/**
 * @desc    Bulk operation on mixed items
 * @route   POST /api/v1/items/bulk-operation
 * @access  Private
 */
export async function handleBulkOperation(req, res) {
  try {
    const { action, items, destination_folder_id } = req.body;

    if (!action || !items || !Array.isArray(items)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Invalid request parameters. action, items (array) are required.",
      });
    }

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
            // Folder move logic: update parent and recursively update paths (simplified here, but should ideally use folder controller logic)
            // For mixed bulk, we just update the parent for now as per external NAS implementation
            await Folder.findOneAndUpdate({ _id: id, user: req.user.id }, { parent: destination_folder_id || null });
          }
        }
        results.success.push(id);
      } catch (err) {
        results.errors.push({ id, error: err.message });
      }
    }

    // Emit socket event to notify client of change
    SocketService.emitToUser(String(req.user.id), "ITEM_BULK_CHANGE", {
      action,
      items,
      destination_folder_id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Bulk Operation Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}
