import mongoose from "mongoose";

// Models
import File from "../models/File.js";
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
} from "../constants/generalConstants.js";

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
 * @desc    Get detailed storage breakdown by category
 * @route   GET /api/v1/quota/breakdown
 * @access  Private
 */
export const getQuotaBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await File.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user.id), is_deleted: false } },
    {
      $group: {
        _id: "$category",
        total_size_bytes: { $sum: "$size_bytes" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        category: "$_id",
        total_size_bytes: 1,
        count: 1,
        _id: 0,
      },
    },
  ]);

  // Ensure all categories are present, even if empty
  const categories = ["image", "video", "audio", "document", "archive", "other"];
  const result = categories.map((cat) => {
    const found = breakdown.find((b) => b.category === cat);
    return found || { category: cat, total_size_bytes: 0, count: 0 };
  });

  return ResponseHelper.success(res, result);
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
