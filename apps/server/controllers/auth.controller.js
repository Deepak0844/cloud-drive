import jwt from "jsonwebtoken";

// Models
import User from "../models/User.js";

// Services
import EmailService from "../services/email.service.js";

// Config
import Env from "../config/env.js";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import logger from "../utils/logger.js";

// Schemas
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/auth.schema.js";

/**
 * Generates a signed JSON Web Token (JWT) with the provided user ID.
 */
function signToken(id) {
  return jwt.sign({ id }, Env.JWT_SECRET, {
    expiresIn: Env.JWT_EXPIRES_IN,
  });
}

/**
 * @desc    Register a user
 * @route   POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  // Validate input
  registerSchema.parse({ body: req.body });

  const { email, password, name } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return ResponseHelper.error(res, "User with this email already exists", StatusCodes.BAD_REQUEST);
  }

  await User.create({ email, password, name });

  return ResponseHelper.success(res, { message: "User registered successfully" }, StatusCodes.CREATED);
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  // Validate input
  loginSchema.parse({ body: req.body });

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return ResponseHelper.error(res, ErrorMessages.INVALID_CREDENTIALS, StatusCodes.UNAUTHORIZED);
  }

  // Check if account is active
  if (user.is_active === false) {
    return ResponseHelper.error(res, "Your account has been disabled. Please contact admin.", StatusCodes.FORBIDDEN);
  }

  // Generate JWT token
  const token = signToken(user._id);

  return ResponseHelper.success(res, {
    message: "User logged in successfully",
    token,
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  return ResponseHelper.success(res, { userInfo: req.user });
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  // Validate input
  forgotPasswordSchema.parse({ body: req.body });

  const { email } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    return ResponseHelper.error(res, "No user found with that email address", StatusCodes.NOT_FOUND);
  }

  // Generate reset token (valid for 1 hour)
  const resetToken = jwt.sign({ id: user._id }, Env.JWT_SECRET, {
    expiresIn: "1h",
  });

  // Construct reset URL
  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password?token=${resetToken}`;

  // Prepare email message
  const message = `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this, please ignore this email.`;

  // Send email
  try {
    await EmailService.sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      message,
    });

    return ResponseHelper.success(res, { message: "Password reset email sent successfully" });
  } catch (emailErr) {
    logger.error("Email send error:", emailErr);
    return ResponseHelper.error(res, ErrorMessages.EMAIL_NOT_SENT, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

/**
 * @desc    Reset password
 * @route   POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  // Validate input
  resetPasswordSchema.parse({ body: req.body });

  const { token, password } = req.body;

  // Verify the reset token
  let decoded;
  try {
    decoded = jwt.verify(token, Env.JWT_SECRET);
  } catch (_err) {
    return ResponseHelper.error(res, ErrorMessages.INVALID_TOKEN, StatusCodes.BAD_REQUEST);
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return ResponseHelper.error(res, "Invalid token", StatusCodes.BAD_REQUEST);
  }

  // Update the user's password
  user.password = password;
  await user.save();

  // Generate a new JWT token
  const newToken = signToken(user._id);

  return ResponseHelper.success(res, {
    token: newToken,
    data: user,
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 */
export const logout = (req, res) => {
  return ResponseHelper.success(res, { message: "User logged out successfully" });
};
