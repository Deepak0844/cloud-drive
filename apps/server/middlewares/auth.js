// Third-party modules
import jwt from "jsonwebtoken";

// Models
import User from "../models/User.js";

// Config
import Env from "../config/env.js";

// Constants
import { ErrorMessages } from "../constants/generalConstants.js";
import { Roles, HttpStatus } from "@shared-constants/constants";

// Middleware
import asyncHandler from "./asyncHandler.js";

// Utils
import ResponseUtils from "../utils/responseUtils.js";

// Protect routes
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  try {
    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      return ResponseUtils.error(res, ErrorMessages.NOT_AUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    // Verify token
    const decoded = jwt.verify(token, Env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return ResponseUtils.error(res, ErrorMessages.NOT_AUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    if (req.user.is_active === false) {
      return ResponseUtils.error(res, ErrorMessages.ACCOUNT_DEACTIVATED, HttpStatus.FORBIDDEN);
    }

    next();
  } catch (err) {
    // Distinguish expired tokens so clients can trigger a token refresh
    if (err.name === "TokenExpiredError") {
      return ResponseUtils.error(res, ErrorMessages.TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
    }
    return ResponseUtils.error(res, ErrorMessages.NOT_AUTHORIZED, HttpStatus.UNAUTHORIZED);
  }
});

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return ResponseUtils.error(
        res,
        `User role ${req.user.role} is not authorized to access this route`,
        HttpStatus.FORBIDDEN
      );
    }
    next();
  };
};

// Simplified alias for admin
export const admin = authorize(Roles.ADMIN);
