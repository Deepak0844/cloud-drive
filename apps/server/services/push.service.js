import { Expo } from "expo-server-sdk";
import logger from "../utils/logger.js";

const expo = new Expo();

/**
 * Send push notifications to specific users
 * @param {Array<string>} pushTokens
 * @param {Object} payload { title, body, data }
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
};

export default PushService;
