import crypto from "crypto";

import Env from "#config/env.js";
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CookieConfig,
  ErrorMessages,
} from "#constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";
import ResponseUtils from "#utils/responseUtils.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// GET /api/v1/csrf-token — issue a token, set it as a readable cookie, return it in the body.
export function issueCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // client JS must read it to echo in the request header
    sameSite: CookieConfig.SAME_SITE,
    ...(Env.NODE_ENV === "production" && { secure: true }),
  });
  return ResponseUtils.success(res, { csrfToken: token });
}

// Double-submit verification, enforced only for cookie-authenticated mutating requests.
export function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }
  // CSRF only applies to cookie-based sessions; Bearer-token clients are immune by design.
  if (!req.cookies?.[AUTH_COOKIE_NAME]) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken) {
    return ResponseUtils.error(res, ErrorMessages.CSRF_INVALID, HttpStatus.FORBIDDEN);
  }

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return ResponseUtils.error(res, ErrorMessages.CSRF_INVALID, HttpStatus.FORBIDDEN);
  }

  return next();
}
