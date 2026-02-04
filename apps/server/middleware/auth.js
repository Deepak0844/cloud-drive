import jwt from "jsonwebtoken";

// Models
import User from "../models/User.js";

// Config
import Env from "../config/env.js";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

/**
 * Extract JWT token from request headers or query parameters
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null if not found
 */
function extractToken(req) {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.slice(7);
  }
  return req.query.token || null;
}

/**
 * Authentication middleware to verify JWT token and attach user to request
 * Extracts token from Authorization header (Bearer scheme) or query parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
export async function protect(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: ErrorMessages.NOT_AUTHORIZED,
      });
    }

    const decoded = jwt.verify(token, Env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: ErrorMessages.NOT_AUTHORIZED,
      });
    }

    req.user = user;
    next();
  } catch (_err) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: ErrorMessages.NOT_AUTHORIZED,
    });
  }
}

/**
 * Authorization middleware to check if user has required roles
 * @param {...string} roles - Required user roles to access the route
 * @returns {Function} Express middleware function
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: ErrorMessages.NOT_AUTHORIZED,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }

    next();
  };
}
