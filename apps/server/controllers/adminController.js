// Models
import File from "#models/File.js";
import QuotaRequest from "#models/QuotaRequest.js";
import User from "#models/User.js";
import { paginateQuery } from "#utils/paginationUtils.js";

// Controllers
import { createNotification } from "#controllers/notificationController.js";

// Services
import SocketService from "#services/socketService.js";
import SystemService from "#services/systemService.js";
import FileService from "#services/fileService.js";

// Constants
import { QuotaStatus, HttpStatus } from "@shared-constants/constants";
import { ErrorMessages, NotificationTypes, SocketEvents } from "#constants/generalConstants.js";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import FormatUtils from "#utils/formatUtils.js";

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { pg, ps } = req.query;
  const queryFilter = { _id: { $ne: req.user.id } };
  const result = await paginateQuery(User, queryFilter, { pg, ps, sort: "name", select: "-password" });
  return ResponseUtils.success(res, result);
});

/**
 * @desc    Update user quota
 * @route   PATCH /api/v1/admin/users/:id/quota
 * @access  Private/Admin
 */
export const updateUserQuota = asyncHandler(async (req, res) => {
  const { quota_bytes } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    return ResponseUtils.error(res, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const oldQuota = user.quota_bytes;
  const isIncrease = quota_bytes > oldQuota;

  user.quota_bytes = quota_bytes;
  await user.save();

  await createNotification(
    user._id,
    NotificationTypes.QUOTA_CHANGE,
    isIncrease ? "Quota Increased" : "Quota Decreased",
    `Your storage quota has been ${isIncrease ? "increased" : "decreased"} to ${FormatUtils.bytesToGB(quota_bytes)} GB`
  );

  SocketService.emitToUser(String(user._id), SocketEvents.QUOTA_UPDATE, {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  return ResponseUtils.success(res, user);
});

/**
 * @desc    Get system stats (Real-time hardware + storage analytics)
 * @route   GET /api/v1/admin/stats
 * @access  Private/Admin
 */
export const getSystemStats = asyncHandler(async (req, res) => {
  const [hardware, analytics] = await Promise.all([
    SystemService.getHardwareStats(),
    SystemService.getStorageAnalytics(),
  ]);

  const userCount = await User.countDocuments();
  const fileCount = await File.countDocuments({ is_deleted: false });

  return ResponseUtils.success(res, {
    system: hardware,
    analytics: analytics,
    counts: {
      total_users: userCount,
      total_files: fileCount,
    },
  });
});

/**
 * @desc    Get all quota requests
 * @route   GET /api/v1/admin/quota-requests
 * @access  Private/Admin
 */
export const getAllQuotaRequests = asyncHandler(async (req, res) => {
  const { pg, ps } = req.query;
  const result = await paginateQuery(QuotaRequest, {}, { pg, ps, sort: "-createdAt", populate: "user" });
  return ResponseUtils.success(res, result);
});

/**
 * @desc    Handle (Approve/Reject) quota request
 * @route   PATCH /api/v1/admin/quota-requests/:id
 * @access  Private/Admin
 */
export const handleQuotaRequest = asyncHandler(async (req, res) => {
  const { status, admin_note } = req.body;
  const request = await QuotaRequest.findById(req.params.id);

  if (!request) {
    return ResponseUtils.error(res, ErrorMessages.QUOTA_REQUEST_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (request.status !== QuotaStatus.PENDING) {
    return ResponseUtils.error(res, ErrorMessages.REQUEST_ALREADY_PROCESSED, HttpStatus.BAD_REQUEST);
  }

  request.status = status;
  request.admin_note = admin_note;
  await request.save();

  const user = await User.findById(request.user);
  if (!user) {
    return ResponseUtils.error(res, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (status === QuotaStatus.APPROVED) {
    user.quota_bytes += request.requested_bytes;
    await user.save();

    await createNotification(
      user._id,
      NotificationTypes.QUOTA_APPROVED,
      "Quota Request Approved",
      `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been approved.`
    );
    SocketService.emitToUser(String(user._id), SocketEvents.NOTIFICATION, {
      type: NotificationTypes.QUOTA_APPROVED,
      title: "Quota Request Approved",
      message: `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been approved.`,
    });
  } else {
    await createNotification(
      user._id,
      NotificationTypes.QUOTA_REJECTED,
      "Quota Request Rejected",
      `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been rejected.`
    );
    SocketService.emitToUser(String(user._id), SocketEvents.NOTIFICATION, {
      type: NotificationTypes.QUOTA_REJECTED,
      title: "Quota Request Rejected",
      message: `Your request for ${FormatUtils.bytesToGB(request.requested_bytes)} GB storage increase has been rejected.`,
    });
  }

  SocketService.emitToUser(String(user._id), SocketEvents.QUOTA_UPDATE, {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  await request.populate("user", "name email");
  return ResponseUtils.success(res, request);
});

/**
 * @desc    Update user status (activate/deactivate)
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Private/Admin
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { is_active } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { is_active }, { new: true });

  if (!user) {
    return ResponseUtils.error(res, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return ResponseUtils.success(res, user);
});

/**
 * @desc    Run deep storage re-analysis and sync
 * @route   POST /api/v1/admin/storage/re-analyze
 * @access  Private/Admin
 */
export const runStorageReanalysis = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const summary = await FileService.deepSyncStorage(userId);

  // Notify all admins via socket that sync is done (optional)
  SocketService.emitToAdmins("STORAGE_SYNC_COMPLETE", { ...summary, targetUserId: userId });

  return ResponseUtils.success(res, summary, HttpStatus.OK, {
    message: userId
      ? `Deep storage re-analysis for user ${userId} completed successfully`
      : "Full deep storage re-analysis completed successfully",
  });
});
