// Services
import AuthService from "#services/authService.js";

// Constants
import { SuccessMessages } from "#constants/generalConstants.js";
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
  const user = await AuthService.updatePassword(req.user.id, currentPassword, newPassword);
  return sendTokenResponse(user, HttpStatus.OK, req, res, SuccessMessages.PASSWORD_UPDATED);
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  await AuthService.forgotPassword(req.body.email);
  return ResponseUtils.success(res, {
    message: "If this email is registered, you will receive a password reset link.",
  });
});

/**
 * @desc    Reset password
 * @route   PUT /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await AuthService.resetPassword(token, password);
  return sendTokenResponse(user, HttpStatus.OK, req, res, SuccessMessages.PASSWORD_RESET);
});
