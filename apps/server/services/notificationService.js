// Models
import Notification from "#models/Notification.js";
import User from "#models/User.js";

// Services
import EmailService from "#services/emailService.js";
import PushService from "#services/pushService.js";
import SocketService from "#services/socketService.js";

// Config
import config from "#config/env.js";

// Constants
import { ErrorMessages, NotificationDefaults, SocketEvents } from "#constants/generalConstants.js";
import { HttpStatus, NotificationTypes } from "@shared-constants/constants";

// Utils
import { AppError } from "#utils/errorUtils.js";
import logger from "#utils/logger.js";
import { paginateQuery } from "#utils/paginationUtils.js";

// ─── Preference Groupings ─────────────────────────────────────────────────────

const STORAGE_ALERT_TYPES = new Set([NotificationTypes.STORAGE_ALERT]);
const SECURITY_ALERT_TYPES = new Set([NotificationTypes.SECURITY_ALERT]);

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Create a notification, respecting the user's notification preferences.
 *
 * Preference gate:
 *   STORAGE_ALERT_TYPES  → gated by user.notification_preferences.storage_alerts
 *   SECURITY_ALERT_TYPES → gated by user.notification_preferences.security_alerts
 *   everything else       → gated by user.notification_preferences.email_notifications
 */
async function createNotification(userId, type, title, message, data = {}) {
  try {
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

    const isStorageOrSecurity = STORAGE_ALERT_TYPES.has(type) || SECURITY_ALERT_TYPES.has(type);
    if (!isStorageOrSecurity && prefs.email_notifications === false) {
      logger.debug(`[Notification] Skipped (email_notifications off) for user ${userId}: ${type}`);
      return null;
    }

    const notification = await Notification.create({ user: userId, type, title, message });

    SocketService.emitToUser(String(userId), SocketEvents.NOTIFICATION, notification.toJSON());

    if (user.push_tokens?.length > 0) {
      PushService.sendPushNotifications(user.push_tokens, { title, body: message, data }).catch((err) =>
        logger.error("Push Service Error:", err)
      );
    }

    if (user.web_push_subscriptions?.length > 0) {
      const expiredEndpoints = await PushService.sendWebPushNotifications(user.web_push_subscriptions, {
        title,
        body: message,
      }).catch((err) => {
        logger.error("[WebPush] Batch error:", err);
        return [];
      });

      if (expiredEndpoints.length > 0) {
        User.updateOne(
          { _id: userId },
          { $pull: { web_push_subscriptions: { endpoint: { $in: expiredEndpoints } } } }
        ).catch(() => {});
      }
    }

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

async function getNotifications(userId, queryParams) {
  const { pg, ps } = queryParams;
  return paginateQuery(Notification, { user: userId }, { pg, ps, sort: "-createdAt" });
}

async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { is_read: true },
    { new: true }
  );
  if (!notification) {
    throw new AppError(ErrorMessages.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return notification;
}

async function markAllAsRead(userId) {
  await Notification.updateMany({ user: userId, is_read: false }, { is_read: true });
}

async function deleteNotification(notificationId, userId) {
  const notification = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
  if (!notification) {
    throw new AppError(ErrorMessages.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return notification;
}

async function deleteAllNotifications(userId) {
  await Notification.deleteMany({ user: userId });
}

async function registerPushToken(userId, token) {
  const user = await User.findById(userId);
  if (!user.push_tokens.includes(token)) {
    user.push_tokens.push(token);
    await user.save();
  }
}

async function registerWebPushSubscription(userId, subscription) {
  // Remove any existing entry for this endpoint, then push the fresh subscription.
  // This handles re-subscriptions after a browser reset without accumulating duplicates.
  await User.updateOne({ _id: userId }, { $pull: { web_push_subscriptions: { endpoint: subscription.endpoint } } });
  await User.updateOne({ _id: userId }, { $push: { web_push_subscriptions: subscription } });
}

const NotificationService = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  registerPushToken,
  registerWebPushSubscription,
};

export default NotificationService;
