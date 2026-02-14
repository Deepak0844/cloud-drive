// Models
import User from "../models/User.js";
import File from "../models/File.js";
import QuotaRequest from "../models/QuotaRequest.js";

// Controllers
import { createNotification } from "./notification.controller.js";

// Services
import SocketService from "../services/socket.service.js";

// Constants
import StatusCodes from "../constants/statusCodes.js";
import ErrorMessages from "../constants/errorMessages.js";

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
export async function getUsers(req, res) {
  try {
    const users = await User.find().select("-password");
    res.status(StatusCodes.OK).json({ success: true, count: users.length, data: users });
  } catch (err) {
    console.error("Get Users Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Update user quota
 * @route   PATCH /api/v1/admin/users/:id/quota
 * @access  Private/Admin
 */
export async function updateUserQuota(req, res) {
  try {
    const { quota_bytes } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.USER_NOT_FOUND,
      });
    }

    const oldQuota = user.quota_bytes;
    const isIncrease = quota_bytes > oldQuota;

    user.quota_bytes = quota_bytes;
    await user.save();

    // Send notification
    await createNotification(
      user._id,
      "QUOTA_CHANGE",
      isIncrease ? "Quota Increased" : "Quota Decreased",
      `Your storage quota has been ${isIncrease ? "increased" : "decreased"} to ${(quota_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    );

    // Emit socket event for real-time usage sync
    SocketService.emitToUser(String(user._id), "QUOTA_UPDATE", {
      quota_bytes: user.quota_bytes,
      used_bytes: user.used_bytes,
    });

    res.status(StatusCodes.OK).json({ success: true, data: user });
  } catch (err) {
    console.error("Update Quota Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Get system stats
 * @route   GET /api/v1/admin/stats
 * @access  Private/Admin
 */
export async function getSystemStats(req, res) {
  try {
    const userCount = await User.countDocuments();
    const fileCount = await File.countDocuments({ is_deleted: false });

    // Aggregation for total storage used
    const stats = await File.aggregate([
      { $match: { is_deleted: false } },
      { $group: { _id: null, totalUsedBytes: { $sum: "$size_bytes" } } },
    ]);

    const totalUsedBytes = stats.length > 0 ? stats[0].totalUsedBytes : 0;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        total_users: userCount,
        total_files: fileCount,
        total_used_bytes: totalUsedBytes,
      },
    });
  } catch (err) {
    console.error("Get System Stats Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Get all quota requests
 * @route   GET /api/v1/admin/quota-requests
 * @access  Private/Admin
 */
export async function getAllQuotaRequests(req, res) {
  try {
    const requests = await QuotaRequest.find().populate("user", "name email").sort("-createdAt");
    res.status(StatusCodes.OK).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    console.error("Get All Quota Requests Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Handle (Approve/Reject) quota request
 * @route   PATCH /api/v1/admin/quota-requests/:id
 * @access  Private/Admin
 */
export async function handleQuotaRequest(req, res) {
  try {
    const { status, admin_note } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Invalid status. Use APPROVED or REJECTED",
      });
    }

    const request = await QuotaRequest.findById(req.params.id);
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: "Quota request not found",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Request already processed",
      });
    }

    request.status = status;
    request.admin_note = admin_note;
    await request.save();

    const user = await User.findById(request.user);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.USER_NOT_FOUND,
      });
    }

    if (status === "APPROVED") {
      user.quota_bytes += request.requested_bytes;
      await user.save();

      // Send approved notification
      await createNotification(
        user._id,
        "QUOTA_APPROVED",
        "Quota Request Approved",
        `Your request for ${(request.requested_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB storage increase has been approved.`
      );

      // Emit socket event for real-time update
      SocketService.emitToUser(String(user._id), "QUOTA_UPDATE", {
        quota_bytes: user.quota_bytes,
        used_bytes: user.used_bytes,
      });
    } else {
      await createNotification(
        user._id,
        "QUOTA_REJECTED",
        "Quota Request Rejected",
        `Your request for ${(request.requested_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB storage increase has been rejected.`
      );

      // Force UI refresh even for rejection
      SocketService.emitToUser(String(user._id), "QUOTA_UPDATE", {
        quota_bytes: user.quota_bytes,
        used_bytes: user.used_bytes,
      });
    }

    await request.populate("user", "name email");
    res.status(StatusCodes.OK).json({ success: true, data: request });
  } catch (err) {
    console.error("Handle Quota Request Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Update user status (activate/deactivate)
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Private/Admin
 */
export async function updateUserStatus(req, res) {
  try {
    const { is_active } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { is_active }, { new: true });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.USER_NOT_FOUND,
      });
    }

    res.status(StatusCodes.OK).json({ success: true, data: user });
  } catch (err) {
    console.error("Update User Status Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}
