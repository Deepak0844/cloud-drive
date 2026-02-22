// Third-party modules
import jwt from "jsonwebtoken";

// Models
import User from "../models/User.js";

// Config
import Env from "../config/env.js";

// Constants
import { ErrorMessages, Roles, StatusCodes } from "../constants/generalConstants.js";

// Middleware
import asyncHandler from "./asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";

// Protect routes
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return ResponseHelper.error(res, ErrorMessages.NOT_AUTHORIZED, StatusCodes.UNAUTHORIZED);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, Env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return ResponseHelper.error(res, ErrorMessages.NOT_AUTHORIZED, StatusCodes.UNAUTHORIZED);
    }

    if (req.user.is_active === false) {
      return ResponseHelper.error(res, ErrorMessages.ACCOUNT_DEACTIVATED, StatusCodes.FORBIDDEN);
    }

    next();
  } catch (_err) {
    return ResponseHelper.error(res, ErrorMessages.NOT_AUTHORIZED, StatusCodes.UNAUTHORIZED);
  }
});

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return ResponseHelper.error(
        res,
        `User role ${req.user.role} is not authorized to access this route`,
        StatusCodes.FORBIDDEN
      );
    }
    next();
  };
};

// Simplified alias for admin
export const admin = authorize(Roles.ADMIN);
