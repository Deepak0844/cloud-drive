// Third-party modules
import nodemailer from "nodemailer";
import pug from "pug";
import path from "path";
import { fileURLToPath } from "url";

// Config
import config from "#config/env.js";

// Utils
import logger from "#utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Send email
 * @param {Object} options { email, subject, message, html, attachments }
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
    html: options.html,
    attachments: options.attachments || [],
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info("Message sent: %s", info.messageId);
}

/**
 * Send a templated HTML email
 * @param {Object} options { email, subject, templateName, data, plainTextMessage }
 */
async function sendTemplateEmail(options) {
  const { email, subject, templateName, data, plainTextMessage } = options;

  try {
    const templatePath = path.join(__dirname, "../templates", `${templateName}.pug`);
    const logoPath = path.join(__dirname, "../public/assets/logo.png");

    const html = pug.renderFile(templatePath, data);

    await sendEmail({
      email,
      subject,
      message: plainTextMessage,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: logoPath,
          cid: "logo", // same cid value as in the pug layout <img src="cid:logo">
        },
      ],
    });
  } catch (err) {
    logger.error(`[EmailService] Template rendering error (${templateName}):`, err);
    // Fallback to plain text if rendering fails
    await sendEmail({
      email,
      subject,
      message: plainTextMessage,
    });
  }
}

// Exports
const EmailService = {
  sendEmail,
  sendTemplateEmail,
};

export default EmailService;
