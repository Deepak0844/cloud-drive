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
 * @desc    Register user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await AuthService.register(name, email, password);
  return sendTokenResponse(user, HttpStatus.CREATED, res, SuccessMessages.REGISTRATION_SUCCESS);
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const user = await AuthService.login(req.body.email, req.body.password, req);
  return sendTokenResponse(user, HttpStatus.OK, res, SuccessMessages.LOGIN_SUCCESS);
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = (req, res) => {
  AuthService.clearAuthCookie(res);
  return ResponseUtils.success(res, {}, HttpStatus.OK, { message: SuccessMessages.LOGOUT_SUCCESS });
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await AuthService.getMe(req.user.id, req.user.role);
  return ResponseUtils.success(res, user, HttpStatus.OK, SuccessMessages.PROFILE_LOADED);
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const update = AuthService.buildProfileUpdate(req.body);
  const user = await AuthService.updateProfile(req.user.id, update);
  return ResponseUtils.success(res, user, HttpStatus.OK, SuccessMessages.PROFILE_UPDATED);
});
