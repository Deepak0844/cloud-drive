import nodemailer from "nodemailer";
import Env from "../config/env.js";

// Send email
async function sendEmail(options) {
  const transporter = nodemailer.createTransport({
    host: Env.SMTP_HOST,
    port: Env.SMTP_PORT,
    auth: {
      user: Env.SMTP_EMAIL,
      pass: Env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `${Env.FROM_NAME} <${Env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await transporter.sendMail(mailOptions);

  console.log("Message sent: %s", info.messageId);
}

export default sendEmail;
