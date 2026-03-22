import config from "#config/env.js";

// Constants
import { AUTH_COOKIE_NAME, CookieConfig } from "#constants/generalConstants.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

/**
 * Helper to get token from model and send response
 */
export function sendTokenResponse(user, statusCode, res, message) {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    httpOnly: CookieConfig.HTTP_ONLY,
    sameSite: CookieConfig.SAME_SITE,
    maxAge: CookieConfig.MAX_AGE_MS,
    ...(config.NODE_ENV === "production" && { secure: true }),
  };

  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);

  // Token is already set in the HttpOnly cookie above — do NOT include it in
  // the response body to avoid leaking it into JS memory, logs, or localStorage.
  return ResponseUtils.success(
    res,
    { user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    statusCode,
    message
  );
}
