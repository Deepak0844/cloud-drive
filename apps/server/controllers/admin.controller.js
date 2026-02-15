// Models
import File from "../models/File.js";
import QuotaRequest from "../models/QuotaRequest.js";
import User from "../models/User.js";

// Controllers
import { createNotification } from "./notification.controller.js";

// Services
import SocketService from "../services/socket.service.js";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";

// Schemas
import { updateUserQuotaSchema, handleQuotaRequestSchema, updateUserStatusSchema } from "../schemas/admin.schema.js";

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  return ResponseHelper.success(res, users, StatusCodes.OK, { count: users.length });
});

/**
 * @desc    Update user quota
 * @route   PATCH /api/v1/admin/users/:id/quota
 * @access  Private/Admin
 */
export const updateUserQuota = asyncHandler(async (req, res) => {
  updateUserQuotaSchema.parse({ body: req.body });

  const { quota_bytes } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    return ResponseHelper.error(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const oldQuota = user.quota_bytes;
  const isIncrease = quota_bytes > oldQuota;

  user.quota_bytes = quota_bytes;
  await user.save();

  await createNotification(
    user._id,
    "QUOTA_CHANGE",
    isIncrease ? "Quota Increased" : "Quota Decreased",
    `Your storage quota has been ${isIncrease ? "increased" : "decreased"} to ${(quota_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  );

  SocketService.emitToUser(String(user._id), "QUOTA_UPDATE", {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  return ResponseHelper.success(res, user);
});

/**
 * @desc    Get system stats
 * @route   GET /api/v1/admin/stats
 * @access  Private/Admin
 */
export const getSystemStats = asyncHandler(async (req, res) => {
  const userCount = await User.countDocuments();
  const fileCount = await File.countDocuments({ is_deleted: false });

  const stats = await File.aggregate([
    { $match: { is_deleted: false } },
    { $group: { _id: null, totalUsedBytes: { $sum: "$size_bytes" } } },
  ]);

  const totalUsedBytes = stats.length > 0 ? stats[0].totalUsedBytes : 0;

  return ResponseHelper.success(res, {
    total_users: userCount,
    total_files: fileCount,
    total_used_bytes: totalUsedBytes,
  });
});

/**
 * @desc    Get all quota requests
 * @route   GET /api/v1/admin/quota-requests
 * @access  Private/Admin
 */
export const getAllQuotaRequests = asyncHandler(async (req, res) => {
  const requests = await QuotaRequest.find().populate("user", "name email").sort("-createdAt");
  return ResponseHelper.success(res, requests, StatusCodes.OK, { count: requests.length });
});

/**
 * @desc    Handle (Approve/Reject) quota request
 * @route   PATCH /api/v1/admin/quota-requests/:id
 * @access  Private/Admin
 */
export const handleQuotaRequest = asyncHandler(async (req, res) => {
  handleQuotaRequestSchema.parse({ body: req.body });

  const { status, admin_note } = req.body;
  const request = await QuotaRequest.findById(req.params.id);

  if (!request) {
    return ResponseHelper.error(res, "Quota request not found", StatusCodes.NOT_FOUND);
  }

  if (request.status !== "PENDING") {
    return ResponseHelper.error(res, "Request already processed", StatusCodes.BAD_REQUEST);
  }

  request.status = status;
  request.admin_note = admin_note;
  await request.save();

  const user = await User.findById(request.user);
  if (!user) {
    return ResponseHelper.error(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  if (status === "APPROVED") {
    user.quota_bytes += request.requested_bytes;
    await user.save();

    await createNotification(
      user._id,
      "QUOTA_APPROVED",
      "Quota Request Approved",
      `Your request for ${(request.requested_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB storage increase has been approved.`
    );
  } else {
    await createNotification(
      user._id,
      "QUOTA_REJECTED",
      "Quota Request Rejected",
      `Your request for ${(request.requested_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB storage increase has been rejected.`
    );
  }

  SocketService.emitToUser(String(user._id), "QUOTA_UPDATE", {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  await request.populate("user", "name email");
  return ResponseHelper.success(res, request);
});

/**
 * @desc    Update user status (activate/deactivate)
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Private/Admin
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  updateUserStatusSchema.parse({ body: req.body });

  const { is_active } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { is_active }, { new: true });

  if (!user) {
    return ResponseHelper.error(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return ResponseHelper.success(res, user);
});
