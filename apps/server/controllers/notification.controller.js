// Models
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Services
import PushService from "../services/push.service.js";
import SocketService from "../services/socket.service.js";

// Constants
import { ErrorMessages, SuccessMessages, SocketEvents, StatusCodes } from "../constants/GeneralConstants.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import logger from "../utils/logger.js";

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort("-createdAt");
  return ResponseHelper.success(res, notifications, StatusCodes.OK, { count: notifications.length });
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { is_read: true },
    { new: true }
  );

  if (!notification) {
    return ResponseHelper.error(res, ErrorMessages.NOTIFICATION_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return ResponseHelper.success(res, notification);
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, is_read: false }, { is_read: true });
  return ResponseHelper.success(res, { message: SuccessMessages.NOTIFICATIONS_MARKED_READ });
});

/**
 * @desc    Register push token
 * @route   POST /api/v1/notifications/push-token
 * @access  Private
 */
export const registerPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user.id);

  if (!user.push_tokens.includes(token)) {
    user.push_tokens.push(token);
    await user.save();
  }

  return ResponseHelper.success(res, { message: SuccessMessages.PUSH_TOKEN_REGISTERED });
});

/**
 * Internal helper to create notification and send push
 * @param {string} userId - ID of the user to notify
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Extra data for push notification
 */
export async function createNotification(userId, type, title, message, data = {}) {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
    });

    SocketService.emitToUser(String(userId), SocketEvents.NOTIFICATION, notification.toJSON());

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
