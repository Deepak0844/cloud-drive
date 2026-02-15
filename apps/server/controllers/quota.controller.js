// Models
import QuotaRequest from "../models/QuotaRequest.js";
import User from "../models/User.js";

// Controllers
import { createNotification } from "./notification.controller.js";

// Constants
import {
  ErrorMessages,
  SuccessMessages,
  Roles,
  StatusCodes,
  NotificationTypes,
  QuotaStatus,
} from "../constants/GeneralConstants.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";

/**
 * @desc    Get current quota usage
 * @route   GET /api/v1/quota/usage
 * @access  Private
 */
export const getQuotaUsage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  return ResponseHelper.success(res, {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
    percentage: (user.used_bytes / user.quota_bytes) * 100,
  });
});

/**
 * @desc    Request quota increase
 * @route   POST /api/v1/quota/request
 * @access  Private
 */
export const requestQuotaIncrease = asyncHandler(async (req, res) => {
  const { requested_bytes, reason } = req.body;

  const existingRequest = await QuotaRequest.findOne({ user: req.user.id, status: QuotaStatus.PENDING });
  if (existingRequest) {
    return ResponseHelper.error(res, ErrorMessages.ALREADY_PENDING_REQUEST, StatusCodes.BAD_REQUEST);
  }

  const quotaRequest = await QuotaRequest.create({
    user: req.user.id,
    requested_bytes,
    reason,
  });

  const admins = await User.find({ role: Roles.ADMIN });
  await Promise.all(
    admins.map((admin) =>
      createNotification(
        admin._id.toString(),
        NotificationTypes.QUOTA_REQUEST,
        "New Quota Request",
        `${req.user.name || req.user.email} has requested ${(requested_bytes / (1024 * 1024 * 1024)).toFixed(0)} GB additional storage.`,
        { requestId: quotaRequest._id }
      )
    )
  );

  return ResponseHelper.success(res, quotaRequest, StatusCodes.OK, {
    message: SuccessMessages.QUOTA_REQUEST_SUBMITTED,
  });
});
