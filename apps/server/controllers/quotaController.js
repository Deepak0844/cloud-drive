import mongoose from "mongoose";

// Models
import File from "#models/File.js";
import QuotaRequest from "#models/QuotaRequest.js";
import User from "#models/User.js";

// Controllers
import { createNotification } from "#controllers/notificationController.js";

// Services
import SocketService from "#services/socketService.js";

// Constants
import {
  ErrorMessages,
  SuccessMessages,
  NotificationTypes,
  SocketEvents,
  FileCategories,
} from "#constants/generalConstants.js";
import { Roles, HttpStatus, QuotaStatus } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import logger from "#utils/logger.js";

/**
 * @desc    Get current quota usage
 * @route   GET /api/v1/quota/usage
 * @access  Private
 */
export const getQuotaUsage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  return ResponseUtils.success(res, {
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
  const categories = [
    FileCategories.IMAGE,
    FileCategories.VIDEO,
    FileCategories.AUDIO,
    FileCategories.DOCUMENT,
    FileCategories.ARCHIVE,
    FileCategories.OTHER,
  ];
  const result = categories.map((cat) => {
    const found = breakdown.find((b) => b.category === cat);
    return found || { category: cat, total_size_bytes: 0, count: 0 };
  });

  return ResponseUtils.success(res, result);
});

/**
 * @desc    Request quota increase
 * @route   POST /api/v1/quota/request
 * @access  Private
 */
export const requestQuotaIncrease = asyncHandler(async (req, res) => {
  try {
    const { requested_bytes, reason } = req.body;

    const existingRequest = await QuotaRequest.findOne({ user: req.user.id, status: QuotaStatus.PENDING });
    if (existingRequest) {
      return ResponseUtils.error(res, ErrorMessages.ALREADY_PENDING_REQUEST, HttpStatus.BAD_REQUEST);
    }

    const quotaRequest = await QuotaRequest.create({
      user: req.user.id,
      requested_bytes,
      reason,
    });

    const admins = await User.find({ role: Roles.ADMIN });
    const requestUser = await User.findById(req.user.id);
    const userNameDisplay = requestUser?.name || requestUser?.email || "A User";

    // 1. Create DB notifications
    await Promise.all(
      admins.map((admin) => {
        // Must return the promise
        return createNotification(
          admin._id.toString(),
          NotificationTypes.QUOTA_REQUEST,
          "New Quota Request",
          `${userNameDisplay} has requested ${(requested_bytes / (1000 * 1000 * 1000)).toFixed(0)} GB additional storage.`,
          { requestId: quotaRequest._id }
        );
      })
    );

    // 2. Alert all admins immediately
    SocketService.emitToAdmins(SocketEvents.NOTIFICATION, {
      type: NotificationTypes.QUOTA_REQUEST,
      title: "New Quota Request",
      message: `${userNameDisplay} has requested ${(requested_bytes / (1000 * 1000 * 1000)).toFixed(0)} GB additional storage.`,
    });

    // 3. Trigger the admin table refresh
    SocketService.emitToAdmins(SocketEvents.QUOTA_REQUEST, { userId: req.user.id });

    return ResponseUtils.success(res, quotaRequest, HttpStatus.OK, {
      message: SuccessMessages.QUOTA_REQUEST_SUBMITTED,
    });
  } catch (error) {
    logger.error("QUOTA REQUEST CRITICAL ERROR:", error);
    throw error;
  }
});
