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

  return ResponseUtils.success(
    res,
    { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    statusCode,
    message
  );
}
