// Models
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Constants
import StatusCodes from "../constants/statusCodes.js";
import ErrorMessages from "../constants/errorMessages.js";

// Services
import SocketService from "../services/socket.service.js";
import PushService from "../services/push.service.js";

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
export async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort("-createdAt");
    res.status(StatusCodes.OK).json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
export async function markAsRead(req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: "Notification not found" });
    }

    res.status(StatusCodes.OK).json({ success: true, data: notification });
  } catch (err) {
    console.error("Mark as Read Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
export async function markAllAsRead(req, res) {
  try {
    await Notification.updateMany({ user: req.user.id, is_read: false }, { is_read: true });

    res.status(StatusCodes.OK).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark All as Read Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Register push token
 * @route   POST /api/v1/notifications/push-token
 * @access  Private
 */
export async function registerPushToken(req, res) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Push token is required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user.push_tokens.includes(token)) {
      user.push_tokens.push(token);
      await user.save();
    }

    res.status(StatusCodes.OK).json({ success: true, message: "Push token registered successfully" });
  } catch (err) {
    console.error("Register Push Token Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * Internal helper to create notification and send push
 * @param {string} userId
 * @param {string} type
 * @param {string} title
 * @param {string} message
 * @param {Object} data
 */
export async function createNotification(userId, type, title, message, data = {}) {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
    });

    // Emit real-time notification via Socket.io
    SocketService.emitToUser(String(userId), "notification", notification.toJSON());

    const user = await User.findById(userId);
    if (user && user.push_tokens?.length > 0) {
      // Send push in background
      PushService.sendPushNotifications(user.push_tokens, {
        title,
        body: message,
        data,
      }).catch((err) => console.error("Push Service Error:", err));
    }

    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}
