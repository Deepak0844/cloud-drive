// Models
import User from "../models/User.js";

// Services
import EmailService from "../services/emailService.js";
import FileService from "../services/fileService.js";

// Controllers
import { createNotification } from "./notificationController.js";

// Constants
import { ErrorMessages, SuccessMessages, NotificationTypes } from "../constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";

// Config
import config from "../config/env.js";

// Middleware
import asyncHandler from "../middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "../utils/responseUtils.js";
import logger from "../utils/logger.js";
import SecurityUtils from "../utils/securityUtils.js";
import { sendTokenResponse } from "../utils/authUtils.js";

// ─── Local Helpers ────────────────────────────────────────────────────────────

/**
 * Helper to send an email for security events if the user's preferences allow it.
 * @param {Object} user - User document
 * @param {String} subject - Email subject
 * @param {String} message - Email body message
 */
async function sendSecurityEmail(user, subject, message, alertType = "security", sessionMetadata = null) {
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
          alertType, // 'login' or 'security'
          actionUrl: `${config.APP_BASE_URL}/settings`,
          session: sessionMetadata,
        },
      });
      logger.info(`[Security Email] Sent HTML "${subject}" to ${user.email}`);
    } else {
      logger.debug(`[Security Email] Skipped "${subject}" to ${user.email} (Setting disabled)`);
    }
  } catch (err) {
    logger.error(`[Security Email] Failed to send to ${user.email}:`, err);
  }
}

/**
 * @desc    Register user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return ResponseUtils.error(res, ErrorMessages.USER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  // Welcome email
  EmailService.sendTemplateEmail({
    email: user.email,
    subject: "Welcome to Cloud Drive!",
    templateName: "welcome-email",
    plainTextMessage: `Welcome to Cloud Drive, ${user.name}! We're excited to have you on board.`,
    data: {
      userName: user.name,
      actionUrl: `${config.APP_BASE_URL}/files`,
    },
  }).catch((err) => logger.error("[Welcome Email] Failed:", err));

  return sendTokenResponse(user, HttpStatus.CREATED, res, SuccessMessages.REGISTRATION_SUCCESS);
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return ResponseUtils.error(res, ErrorMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
  }

  // Check if account is active
  if (!user.is_active) {
    return ResponseUtils.error(res, ErrorMessages.ACCOUNT_DEACTIVATED, HttpStatus.FORBIDDEN);
  }

  // Send security email and in-app notification
  sendSecurityEmail(
    user,
    "New login to your Cloud Drive account",
    "We noticed a new login to your Cloud Drive account. If this was you, you can safely ignore this email. If you did not log in, please reset your password immediately and contact support.",
    "login",
    SecurityUtils.getSessionMetadata(req)
  );

  createNotification(
    user._id,
    NotificationTypes.SECURITY_ALERT,
    "New Login Detected",
    "A new login was detected on your account. If this wasn't you, please change your password immediately."
  ).catch(() => {});

  sendTokenResponse(user, HttpStatus.OK, res, SuccessMessages.LOGIN_SUCCESS);
});

/**
 * @desc    Logout user
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
export const logout = (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
  return ResponseUtils.success(res, {}, HttpStatus.OK, { message: SuccessMessages.LOGOUT_SUCCESS });
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  // Sync storage quota only for standard users
  if (req.user.role !== "ADMIN") {
    await FileService.recalculateUsedBytes(req.user.id);
  }

  const userDoc = await User.findById(req.user.id);
  const user = userDoc.toObject();

  if (user.role === "ADMIN") {
    delete user.quota_bytes;
    delete user.used_bytes;
  }

  return ResponseUtils.success(res, user);
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, notification_preferences } = req.body;

  const update = {};
  if (name !== undefined) {
    update.name = name;
  }
  if (email !== undefined) {
    update.email = email;
  }

  if (notification_preferences) {
    if (notification_preferences.email_notifications !== undefined) {
      update["notification_preferences.email_notifications"] = notification_preferences.email_notifications;
    }
    if (notification_preferences.storage_alerts !== undefined) {
      update["notification_preferences.storage_alerts"] = notification_preferences.storage_alerts;
    }
    if (notification_preferences.security_alerts !== undefined) {
      update["notification_preferences.security_alerts"] = notification_preferences.security_alerts;
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: update },
    {
      new: true,
      runValidators: true,
    }
  );

  return ResponseUtils.success(res, user);
});
