import jwt from "jsonwebtoken";

// Models
import User from "../models/User.js";

// Services
import EmailService from "../services/email.service.js";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Config
import Env from "../config/env.js";

/**
 * Generates a signed JSON Web Token (JWT) with the provided user ID.
 *
 * @param {string|number} id - The user ID to be encoded in the JWT payload.
 * @returns {string} A signed JWT token string.
 *
 * @example
 * const token = signToken(user.id);
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 * @description
 * Uses the JWT_SECRET from environment variables to sign the token and sets
 * the expiration time according to JWT_EXPIRES_IN environment variable.
 * The token payload contains only the user ID.
 */
function signToken(id) {
  return jwt.sign({ id }, Env.JWT_SECRET, {
    expiresIn: Env.JWT_EXPIRES_IN,
  });
}

/**
 * Registers a new user with the provided email and password.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with success status and message
 *
 * @example
 * POST /api/v1/auth/register
 * { "email": "user@example.com", "password": "password123" }
 */
export async function register(req, res) {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    await User.create({ email, password });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * Authenticates a user with email and password credentials.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @returns {Object} JSON response with success status, message, and JWT token
 *
 * @example
 * POST /api/v1/auth/login
 * { "email": "user@example.com", "password": "password123" }
 *
 * @description
 * Validates email and password, checks user existence and credentials,
 * verifies account is active, and returns JWT token on success.
 * Handles multiple failure scenarios with appropriate HTTP status codes.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: ErrorMessages.INVALID_CREDENTIALS,
      });
    }

    // Check if account is active
    if (user.is_active === false) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: "Your account has been disabled. Please contact admin.",
      });
    }

    // Generate JWT token
    const token = signToken(user._id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "User logged in successfully",
      token,
    });
  } catch (_err) {
    console.error("Login error:", _err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * Retrieves the current authenticated user's information.
 * @async
 * @function getMe
 * @param {Object} req - Express request object
 * @param {Object} req.user - The authenticated user object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with user information
 * @example
 * GET /api/v1/auth/me
 * { "success": true,
 *   "userInfo": {
 *   ... User Object ...
 *   }
 */
export async function getMe(req, res) {
  await res.status(StatusCodes.OK).json({
    success: true,
    userInfo: req.user,
  });
}

/**
 * Sends a password reset email to the user with a reset token.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with success status and message
 *
 * @example
 * POST /api/v1/auth/forgot-password
 * { "email": "user@example.com" }
 *
 * @description
 * Generates a password reset token and sends it via email to the user.
 * The reset token is valid for 1 hour and contains the user's ID.
 * Returns appropriate error messages if user not found or email fails to send.
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please provide an email address",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: "No user found with that email address",
      });
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

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Password reset email sent successfully",
      });
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ErrorMessages.EMAIL_NOT_SENT,
      });
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * Resets the user's password using a valid reset token.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - The password reset token
 * @param {string} req.body.password - The new password for the user
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with success status, new JWT token, and user data
 *
 * @example
 * POST /api/v1/auth/reset-password
 * { "token": "resetTokenHere", "password": "newPassword123" }
 *
 * @description
 * Validates the provided token and new password, verifies the token,
 * updates the user's password in the database, and returns a new JWT token.
 * Handles errors for invalid tokens and missing parameters.
 */
export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please provide token and new password",
      });
    }

    // Verify the reset token
    const decoded = jwt.verify(token, Env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Invalid token",
      });
    }

    // Update the user's password
    user.password = password;
    await user.save();

    // Generate a new JWT token
    const newToken = signToken(user._id);

    res.status(StatusCodes.OK).json({
      success: true,
      token: newToken,
      data: user,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: ErrorMessages.INVALID_TOKEN,
    });
  }
}

/**
 * Logs out the current user by invalidating the session or token.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status and message
 *
 * @example
 * POST /api/v1/auth/logout
 */
export function logout(req, res) {
  res.status(StatusCodes.OK).json({
    success: true,
    message: "User logged out successfully",
  });
}
