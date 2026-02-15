// Models
import User from "../models/User.js";

// Services
import EmailService from "../services/email.service.js";

// Constants
import { ErrorMessages, SuccessMessages, StatusCodes } from "../constants/GeneralConstants.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";

/**
 * Helper to get token from model and send response
 */
function sendTokenResponse(user, statusCode, res, message) {
  const token = user.getSignedJwtToken();

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

  sendTokenResponse(user, StatusCodes.CREATED, res, SuccessMessages.REGISTRATION_SUCCESS);
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

  sendTokenResponse(user, StatusCodes.OK, res, SuccessMessages.LOGIN_SUCCESS);
});

/**
 * @desc    Logout user
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  return ResponseHelper.success(res, {}, StatusCodes.OK, { message: SuccessMessages.LOGOUT_SUCCESS });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  return ResponseHelper.success(res, user);
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgotpassword
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return ResponseHelper.error(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset url
  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password?token=${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl} \n\n (Include the token in your request body)`;

  try {
    await EmailService.sendEmail({
      email: user.email,
      subject: "Password reset token",
      message,
    });

    return ResponseHelper.success(res, { message: "Email sent" });
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
