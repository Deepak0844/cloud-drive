// Models
import User from "../models/User.js";

// Services
import EmailService from "../services/email.service.js";
import FileService from "../services/file.service.js";

// Controllers
import { createNotification } from "./notification.controller.js";

// Constants
import { ErrorMessages, SuccessMessages, StatusCodes, NotificationTypes } from "../constants/generalConstants.js";

// Config
import config from "../config/env.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
import SecurityUtils from "../utils/securityUtils.js";

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
 * Helper to get token from model and send response
 */
function sendTokenResponse(user, statusCode, res, message) {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ...(config.NODE_ENV === "production" && { secure: true }),
  };

  res.cookie("token", token, cookieOptions);

  return ResponseHelper.success(
    res,
    { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    statusCode,
    { message }
  );
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
    return ResponseHelper.error(res, ErrorMessages.USER_ALREADY_EXISTS, StatusCodes.BAD_REQUEST);
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

  return sendTokenResponse(user, StatusCodes.CREATED, res, SuccessMessages.REGISTRATION_SUCCESS);
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
    return ResponseHelper.error(res, ErrorMessages.INVALID_CREDENTIALS, StatusCodes.UNAUTHORIZED);
  }

  // Check if account is active
  if (!user.is_active) {
    return ResponseHelper.error(res, ErrorMessages.ACCOUNT_DEACTIVATED, StatusCodes.FORBIDDEN);
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

  sendTokenResponse(user, StatusCodes.OK, res, SuccessMessages.LOGIN_SUCCESS);
});

/**
 * @desc    Logout user
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
export const logout = (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
  return ResponseHelper.success(res, {}, StatusCodes.OK, { message: SuccessMessages.LOGOUT_SUCCESS });
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

  return ResponseHelper.success(res, user);
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

  return ResponseHelper.success(res, user);
});

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.matchPassword(currentPassword))) {
    return ResponseHelper.error(res, "Incorrect current password", StatusCodes.UNAUTHORIZED);
  }

  // Set new password
  user.password = newPassword;
  await user.save();

  // Fire an in-app security alert
  createNotification(
    user._id,
    NotificationTypes.SECURITY_ALERT,
    "Password Changed",
    "Your account password was just changed. If this wasn't you, please contact support immediately."
  ).catch(() => {}); // Non-blocking

  // Fire a security email
  sendSecurityEmail(
    user,
    "Your Cloud Drive password was changed",
    "Your account password was just changed successfully. If you did not make this change, please contact support to secure your account.",
    "security",
    SecurityUtils.getSessionMetadata(req)
  );

  sendTokenResponse(user, StatusCodes.OK, res, "Password updated successfully");
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgotpassword
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Always return 200 to prevent email enumeration attacks
  // If user doesn't exist, silently do nothing
  if (!user) {
    return ResponseHelper.success(res, {
      message: "If this email is registered, you will receive a password reset link.",
    });
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset url pointing to the frontend reset page
  const resetUrl = `${config.APP_BASE_URL}/reset-password?token=${resetToken}`;

  try {
    await EmailService.sendTemplateEmail({
      email: user.email,
      subject: "Reset your Cloud Drive password",
      templateName: "security-alert",
      plainTextMessage: `You requested a password reset. Visit the following link to reset your password: ${resetUrl}. This link expires in 10 minutes. If you did not request this, please ignore this email.`,
      data: {
        userName: user.name,
        alertTitle: "Password Reset Request",
        alertMessage:
          "We received a request to reset the password for your Cloud Drive account. Click the button below to choose a new password. This link will expire in 10 minutes.",
        alertType: "security",
        actionUrl: resetUrl,
        actionLabel: "Reset Password",
        session: null,
      },
    });

    return ResponseHelper.success(res, {
      message: "If this email is registered, you will receive a password reset link.",
    });
  } catch (_err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return ResponseHelper.error(res, ErrorMessages.EMAIL_NOT_SENT, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

/**
 * @desc    Reset password
 * @route   PUT /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findByResetToken(token);

  if (!user) {
    return ResponseHelper.error(res, ErrorMessages.INVALID_TOKEN, StatusCodes.BAD_REQUEST);
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, StatusCodes.OK, res, "Password reset success");
});
