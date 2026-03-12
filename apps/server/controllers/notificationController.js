// Models
import Notification from "#models/Notification.js";
import User from "#models/User.js";

// Services
import PushService from "#services/pushService.js";
import SocketService from "#services/socketService.js";
import EmailService from "#services/emailService.js";

// Config
import config from "#config/env.js";

// Constants
import {
  ErrorMessages,
  SuccessMessages,
  SocketEvents,
  NotificationTypes,
  NotificationDefaults,
} from "#constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import logger from "#utils/logger.js";

// ─── Preference Groupings ─────────────────────────────────────────────────────

/**
 * Notification types that are gated by the `storage_alerts` preference.
 */
const STORAGE_ALERT_TYPES = new Set([NotificationTypes.STORAGE_ALERT]);

/**
 * Notification types that are gated by the `security_alerts` preference.
 */
const SECURITY_ALERT_TYPES = new Set([NotificationTypes.SECURITY_ALERT]);

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort("-createdAt");
  return ResponseUtils.success(res, notifications, HttpStatus.OK, { count: notifications.length });
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
    return ResponseUtils.error(res, ErrorMessages.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return ResponseUtils.success(res, notification);
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, is_read: false }, { is_read: true });
  return ResponseUtils.success(res, { message: SuccessMessages.NOTIFICATIONS_MARKED_READ });
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

  return ResponseUtils.success(res, { message: SuccessMessages.PUSH_TOKEN_REGISTERED });
});

/**
 * Internal helper to create a notification, respecting the user's notification preferences.
 *
 * Preference gate:
 *   STORAGE_ALERT_TYPES  → gated by user.notification_preferences.storage_alerts
 *   SECURITY_ALERT_TYPES → gated by user.notification_preferences.security_alerts
 *   everything else       → gated by user.notification_preferences.email_notifications
 *
 * @param {string} userId - ID of the user to notify
 * @param {string} type - Notification type (from NotificationTypes)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Extra data for push notification
 * @returns {Promise<Notification|null>} The created notification, or null if blocked by preference
 */
export async function createNotification(userId, type, title, message, data = {}) {
  try {
    // ── Check user notification preferences ───────────────────────────────────
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`[Notification] User ${userId} not found. Skipping notification.`);
      return null;
    }

    const prefs = user.notification_preferences ?? {};

    if (STORAGE_ALERT_TYPES.has(type) && prefs.storage_alerts === false) {
      logger.debug(`[Notification] Skipped (storage_alerts off) for user ${userId}: ${type}`);
      return null;
    }

    if (SECURITY_ALERT_TYPES.has(type) && prefs.security_alerts === false) {
      logger.debug(`[Notification] Skipped (security_alerts off) for user ${userId}: ${type}`);
      return null;
    }

    // For all other types (SYSTEM_ALERT, QUOTA_*, UPLOAD_COMPLETE, etc.) gate by email_notifications
    const isStorageOrSecurity = STORAGE_ALERT_TYPES.has(type) || SECURITY_ALERT_TYPES.has(type);
    if (!isStorageOrSecurity && prefs.email_notifications === false) {
      logger.debug(`[Notification] Skipped (email_notifications off) for user ${userId}: ${type}`);
      return null;
    }

    // ── Persist and deliver ───────────────────────────────────────────────────
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
    });

    SocketService.emitToUser(String(userId), SocketEvents.NOTIFICATION, notification.toJSON());

    if (user.push_tokens?.length > 0) {
      PushService.sendPushNotifications(user.push_tokens, {
        title,
        body: message,
        data,
      }).catch((err) => logger.error("Push Service Error:", err));
    }

    // ── Email ─────────────────────────────────────────────────────────────────
    if (type === NotificationTypes.STORAGE_ALERT && user.email) {
      EmailService.sendTemplateEmail({
        email: user.email,
        subject: title,
        templateName: "storage-alert",
        plainTextMessage: message,
        data: {
          userName: user.name,
          alertTitle: title,
          alertMessage: message,
          usedPercentage: data.usedPercentage || NotificationDefaults.USED_PERCENTAGE,
          totalQuota: data.totalQuota || NotificationDefaults.TOTAL_QUOTA,
          actionUrl: `${config.APP_BASE_URL}/quota`,
        },
      }).catch((err) => logger.error(`[StorageAlert Email] Failed:`, err));
    }

    return notification;
  } catch (err) {
    logger.error("Error creating notification:", err);
  }
}
