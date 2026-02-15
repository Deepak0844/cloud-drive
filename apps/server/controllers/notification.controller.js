// Models
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Constants
import StatusCodes from "../constants/statusCodes.js";

// Services
import SocketService from "../services/socket.service.js";
import PushService from "../services/push.service.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import logger from "../utils/logger.js";

// Schemas
import { registerPushTokenSchema } from "../schemas/common.schema.js";

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort("-createdAt");
  return ResponseHelper.success(res, notifications, StatusCodes.OK, { count: notifications.length });
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { is_read: true },
    { new: true }
  );

  if (!notification) {
    return ResponseHelper.error(res, "Notification not found", StatusCodes.NOT_FOUND);
  }

  return ResponseHelper.success(res, notification);
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, is_read: false }, { is_read: true });
  return ResponseHelper.success(res, { message: "All notifications marked as read" });
});

/**
 * @desc    Register push token
 * @route   POST /api/v1/notifications/push-token
 */
export const registerPushToken = asyncHandler(async (req, res) => {
  registerPushTokenSchema.parse({ body: req.body });

  const { token } = req.body;
  const user = await User.findById(req.user.id);

  if (!user.push_tokens.includes(token)) {
    user.push_tokens.push(token);
    await user.save();
  }

  return ResponseHelper.success(res, { message: "Push token registered successfully" });
});

/**
 * Internal helper to create notification and send push
 */
export async function createNotification(userId, type, title, message, data = {}) {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
    });

    SocketService.emitToUser(String(userId), "notification", notification.toJSON());

    const user = await User.findById(userId);
    if (user && user.push_tokens?.length > 0) {
      PushService.sendPushNotifications(user.push_tokens, {
        title,
        body: message,
        data,
      }).catch((err) => logger.error("Push Service Error:", err));
    }

    return notification;
  } catch (err) {
    logger.error("Error creating notification:", err);
  }
}
