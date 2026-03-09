// Models
import User from "#models/User.js";

// Services
import EmailService from "#services/emailService.js";

// Config
import config from "#config/env.js";

// Constants
import { ErrorMessages } from "#constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import { sendTokenResponse } from "#utils/authUtils.js";

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
    return ResponseUtils.error(res, "Incorrect current password", HttpStatus.UNAUTHORIZED);
  }

  // Set new password
  user.password = newPassword;
  await user.save();

  // Fire an in-app security alert
  const { createNotification } = await import("#controllers/notificationController.js");
  createNotification(
    user._id,
    "security", // NotificationTypes.SECURITY_ALERT
    "Password Changed",
    "Your account password was just changed. If this wasn't you, please contact support immediately."
  ).catch(() => {}); // Non-blocking

  // Fire a security email - SecurityUtils is skipped or simplified to avoid circularity if not needed
  // Using direct EmailService for security emails if `sendSecurityEmail` is not available
  EmailService.sendTemplateEmail({
    email: user.email,
    subject: "Your Cloud Drive password was changed",
    templateName: "security-alert",
    plainTextMessage:
      "Your account password was just changed successfully. If you did not make this change, please contact support to secure your account.",
    data: {
      userName: user.name,
      alertTitle: "Your Cloud Drive password was changed",
      alertMessage:
        "Your account password was just changed successfully. If you did not make this change, please contact support to secure your account.",
      alertType: "security",
      actionUrl: null,
      actionLabel: null,
      session: null, // Ideally req context, but omitted here for simplicity
    },
  }).catch(() => {});

  sendTokenResponse(user, HttpStatus.OK, res, "Password updated successfully");
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
    return ResponseUtils.success(res, {
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

    return ResponseUtils.success(res, {
      message: "If this email is registered, you will receive a password reset link.",
    });
  } catch (_err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return ResponseUtils.error(res, ErrorMessages.EMAIL_NOT_SENT, HttpStatus.INTERNAL_SERVER_ERROR);
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
    return ResponseUtils.error(res, ErrorMessages.INVALID_TOKEN, HttpStatus.BAD_REQUEST);
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, HttpStatus.OK, res, "Password reset success");
});
