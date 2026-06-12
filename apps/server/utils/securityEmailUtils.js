// Config
import config from "#config/env.js";

// Services
import EmailService from "#services/emailService.js";

// Utils
import logger from "#utils/logger.js";

/**
 * Send a security-alert email if the user's notification preferences allow it.
 * Fire-and-forget safe — all errors are caught and logged internally.
 *
 * @param {object} user - Mongoose User document
 * @param {string} subject - Email subject line
 * @param {string} message - Plain-text body
 * @param {string} [alertType="security"] - Alert category rendered in the template
 * @param {object|null} [sessionMetadata=null] - Optional session info (IP, device, etc.)
 * @returns {Promise<void>}
 */
export async function sendSecurityEmail(user, subject, message, alertType = "security", sessionMetadata = null) {
  try {
    const prefs = user.notification_preferences ?? {};
    if (prefs.security_alerts !== false && user.email) {
      await EmailService.sendTemplateEmail({
        email: user.email,
        subject,
        templateName: "security-alert",
        plainTextMessage: message,
        data: {
          userName: user.name,
          alertTitle: subject,
          alertMessage: message,
          alertType,
          actionUrl: `${config.APP_BASE_URL}/settings`,
          session: sessionMetadata,
        },
      });
      logger.info(`[Security Email] Sent HTML "${subject}" to ${user.email}`);
    } else {
      logger.debug(`[Security Email] Skipped "${subject}" to ${user.email} (Setting disabled)`);
    }
  } catch (ex) {
    logger.error(`[Security Email] Failed to send to ${user.email}:`, ex);
  }
}
