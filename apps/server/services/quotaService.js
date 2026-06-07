import mongoose from "mongoose";

// Models
import File from "#models/File.js";
import QuotaRequest from "#models/QuotaRequest.js";
import User from "#models/User.js";

// Services
import NotificationService from "#services/notificationService.js";
import SocketService from "#services/socketService.js";

// Constants
import { ErrorMessages, SocketEvents } from "#constants/generalConstants.js";
import {
  HttpStatus,
  QuotaStatus,
  Roles,
  ByteMultipliers,
  FileCategories,
  NotificationTypes,
  PERCENTAGE_MULTIPLIER,
} from "@shared-constants/constants";

// Utils
import { AppError } from "#utils/errorUtils.js";

// ─── Service Functions ────────────────────────────────────────────────────────

async function getQuotaUsage(userId) {
  const user = await User.findById(userId);
  return {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
    percentage: (user.used_bytes / user.quota_bytes) * PERCENTAGE_MULTIPLIER,
  };
}

async function getQuotaBreakdown(userId) {
  const breakdown = await File.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), is_deleted: false } },
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

  const categories = [
    FileCategories.IMAGE,
    FileCategories.VIDEO,
    FileCategories.AUDIO,
    FileCategories.DOCUMENT,
    FileCategories.ARCHIVE,
    FileCategories.OTHER,
  ];

  return categories.map((cat) => {
    const found = breakdown.find((b) => b.category === cat);
    return found || { category: cat, total_size_bytes: 0, count: 0 };
  });
}

async function requestQuotaIncrease(userId, requested_bytes, reason) {
  const existingRequest = await QuotaRequest.findOne({ user: userId, status: QuotaStatus.PENDING });
  if (existingRequest) {
    throw new AppError(ErrorMessages.ALREADY_PENDING_REQUEST, HttpStatus.BAD_REQUEST);
  }

  const quotaRequest = await QuotaRequest.create({ user: userId, requested_bytes, reason });

  const [admins, requestUser] = await Promise.all([User.find({ role: Roles.ADMIN }), User.findById(userId)]);

  const userNameDisplay = requestUser?.name || requestUser?.email || "A User";
  const gbAmount = (requested_bytes / ByteMultipliers.GB).toFixed(0);
  const notificationMessage = `${userNameDisplay} has requested ${gbAmount} GB additional storage.`;

  await Promise.all(
    admins.map((admin) =>
      NotificationService.createNotification(
        admin._id.toString(),
        NotificationTypes.QUOTA_REQUEST,
        "New Quota Request",
        notificationMessage,
        { requestId: quotaRequest._id }
      )
    )
  );

  SocketService.emitToAdmins(SocketEvents.NOTIFICATION, {
    type: NotificationTypes.QUOTA_REQUEST,
    title: "New Quota Request",
    message: notificationMessage,
  });

  SocketService.emitToAdmins(SocketEvents.QUOTA_REQUEST, { userId });

  return quotaRequest;
}

const QuotaService = {
  getQuotaUsage,
  getQuotaBreakdown,
  requestQuotaIncrease,
};

export default QuotaService;
