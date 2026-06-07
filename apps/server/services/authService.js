// Models
import User from "#models/User.js";

// Services
import EmailService from "#services/emailService.js";
import NotificationService from "#services/notificationService.js";

// Config
import config from "#config/env.js";

// Constants
import { ErrorMessages, NotificationMessages, AUTH_COOKIE_NAME, CookieConfig } from "#constants/generalConstants.js";
import { HttpStatus, Roles, NotificationTypes } from "@shared-constants/constants";

// Utils
import { AppError } from "#utils/errorUtils.js";
import CryptoUtils from "#utils/cryptoUtils.js";
import SecurityUtils from "#utils/securityUtils.js";
import logger from "#utils/logger.js";

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Send a security-alert email if the user's preferences allow it.
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
          alertType,
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

async function register(name, email, password) {
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new AppError(ErrorMessages.USER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
  }

  const { wrappedKey } = CryptoUtils.generateAndWrapUserKey();

  const user = await User.create({ name, email, password, encryption_key_wrapped: wrappedKey });

  EmailService.sendTemplateEmail({
    email: user.email,
    subject: NotificationMessages.WELCOME_SUBJECT,
    templateName: "welcome-email",
    plainTextMessage: `Welcome to Cloud Drive, ${user.name}! We're excited to have you on board.`,
    data: { userName: user.name, actionUrl: `${config.APP_BASE_URL}/files` },
  }).catch((err) => logger.error("[Welcome Email] Failed:", err));

  return user;
}

async function login(email, password, req) {
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError(ErrorMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
  }

  if (!user.is_active) {
    throw new AppError(ErrorMessages.ACCOUNT_DEACTIVATED, HttpStatus.FORBIDDEN);
  }

  sendSecurityEmail(
    user,
    NotificationMessages.NEW_LOGIN_TITLE,
    NotificationMessages.NEW_LOGIN_BODY,
    "login",
    SecurityUtils.getSessionMetadata(req)
  );

  NotificationService.createNotification(
    user._id,
    NotificationTypes.SECURITY_ALERT,
    "New Login Detected",
    "A new login was detected on your account. If this wasn't you, please change your password immediately."
  ).catch(() => {});

  return user;
}

async function getMe(userId, role) {
  const userDoc = await User.findById(userId);
  const user = userDoc.toObject();

  if (role !== Roles.ADMIN) {
    return user;
  }

  const { quota_bytes: _quota, used_bytes: _used, ...adminView } = user;
  return adminView;
}

async function updateProfile(userId, fields) {
  return User.findByIdAndUpdate(userId, { $set: fields }, { new: true, runValidators: true });
}

async function updatePassword(userId, currentPassword, newPassword, user) {
  const userWithPassword = user || (await User.findById(userId).select("+password"));

  if (!(await userWithPassword.matchPassword(currentPassword))) {
    throw new AppError(ErrorMessages.INCORRECT_PASSWORD, HttpStatus.UNAUTHORIZED);
  }

  userWithPassword.password = newPassword;
  await userWithPassword.save();

  NotificationService.createNotification(
    userWithPassword._id,
    NotificationTypes.SECURITY_ALERT,
    "Password Changed",
    "Your account password was just changed. If this wasn't you, please contact support immediately."
  ).catch(() => {});

  EmailService.sendTemplateEmail({
    email: userWithPassword.email,
    subject: "Your Cloud Drive password was changed",
    templateName: "security-alert",
    plainTextMessage:
      "Your account password was just changed successfully. If you did not make this change, please contact support to secure your account.",
    data: {
      userName: userWithPassword.name,
      alertTitle: "Your Cloud Drive password was changed",
      alertMessage:
        "Your account password was just changed successfully. If you did not make this change, please contact support to secure your account.",
      alertType: "security",
      actionUrl: null,
      actionLabel: null,
      session: null,
    },
  }).catch(() => {});

  return userWithPassword;
}

async function forgotPassword(email) {
  const user = await User.findOne({ email });

  // Return silently to prevent email enumeration
  if (!user) {
    return null;
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

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
  } catch (ex) {
    logger.error("[ForgotPassword] Email send failed:", ex);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError(ErrorMessages.EMAIL_NOT_SENT, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

async function resetPassword(token, password) {
  const user = await User.findByResetToken(token);
  if (!user) {
    throw new AppError(ErrorMessages.INVALID_TOKEN, HttpStatus.BAD_REQUEST);
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return user;
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: CookieConfig.HTTP_ONLY, sameSite: CookieConfig.SAME_SITE });
}

function buildProfileUpdate(body) {
  const { name, email, notification_preferences } = body;
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

  return update;
}

const AuthService = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  clearAuthCookie,
  buildProfileUpdate,
  sendSecurityEmail,
};

export default AuthService;
