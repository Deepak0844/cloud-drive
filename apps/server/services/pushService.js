// Third-party modules
import { Expo } from "expo-server-sdk";
import webpush from "web-push";

// Config
import Env from "#config/env.js";

// Utils
import logger from "#utils/logger.js";

const expo = new Expo();

// ─── VAPID Configuration ──────────────────────────────────────────────────────

function configureWebPush() {
  if (!Env.VAPID_PUBLIC_KEY || !Env.VAPID_PRIVATE_KEY) {
    logger.warn("[WebPush] VAPID keys not configured — skipping web push");
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${Env.VAPID_EMAIL || "noreply@cloud-drive.com"}`,
    Env.VAPID_PUBLIC_KEY,
    Env.VAPID_PRIVATE_KEY
  );
  return true;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Send Web Push notifications to browser push subscriptions.
 * Returns the list of endpoints that are expired (410/404) for the caller to remove.
 * @param {Array<Object>} subscriptions
 * @param {{ title: string, body: string }} payload
 * @returns {Promise<string[]>} expired endpoints
 */
async function sendWebPushNotifications(subscriptions, payload) {
  if (!configureWebPush() || !subscriptions?.length) {
    return [];
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, JSON.stringify(payload)))
  );

  const expiredEndpoints = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const code = result.reason?.statusCode;
      if (code === 404 || code === 410) {
        expiredEndpoints.push(subscriptions[i].endpoint);
      } else {
        logger.error("[WebPush] Send error:", result.reason?.message || result.reason);
      }
    }
  });

  return expiredEndpoints;
}

/**
 * Send push notifications to Expo (React Native) push tokens.
 * @param {Array<string>} pushTokens - Array of Expo push tokens
 * @param {Object} payload - Notification payload { title, body, data }
 * @returns {Promise<Array>} - Array of push tickets
 */
async function sendPushNotifications(pushTokens, payload) {
  const messages = [];
  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      logger.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      logger.error("Error sending push chunk:", error);
    }
  }

  return tickets;
}

// Exports
const PushService = {
  sendPushNotifications,
  sendWebPushNotifications,
};

export default PushService;
