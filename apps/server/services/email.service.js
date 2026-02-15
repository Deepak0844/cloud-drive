import nodemailer from "nodemailer";

// Config
import config from "../config/env.js";

// Utils
import logger from "../utils/logger.js";

/**
 * Send email
 * @param {Object} options { email, subject, message }
 */
async function sendEmail(options) {
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    auth: {
      user: config.SMTP_EMAIL,
      pass: config.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `${config.FROM_NAME} <${config.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info("Message sent: %s", info.messageId);
}

// Exports
const EmailService = {
  sendEmail,
};

export default EmailService;
