import config from "#config/env.js";

// Constants
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME, CookieConfig } from "#constants/generalConstants.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

/**
 * Issues access + refresh cookies and returns user info in the response body.
 * When X-Platform: mobile is present, also returns tokens in the body.
 * Saves the user document to persist the hashed refresh token.
 */
export async function sendTokenResponse(user, statusCode, req, res, message) {
  const accessToken = user.getSignedJwtToken();
  const plainRefreshToken = user.getRefreshToken();

  await user.save({ validateBeforeSave: false });

  const baseOptions = {
    httpOnly: CookieConfig.HTTP_ONLY,
    sameSite: CookieConfig.SAME_SITE,
    ...(config.NODE_ENV === "production" && { secure: true }),
  };

  const isMobile = req.headers["x-platform"] === "mobile";

  if (!isMobile) {
    res.cookie(AUTH_COOKIE_NAME, accessToken, { ...baseOptions, maxAge: CookieConfig.ACCESS_MAX_AGE_MS });
    res.cookie(REFRESH_COOKIE_NAME, plainRefreshToken, { ...baseOptions, maxAge: CookieConfig.REFRESH_MAX_AGE_MS });
  }

  const userObj = { id: user._id, name: user.name, email: user.email, role: user.role };

  if (isMobile) {
    return ResponseUtils.success(
      res,
      { user: userObj, accessToken, refreshToken: plainRefreshToken },
      statusCode,
      message
    );
  }

  return ResponseUtils.success(res, { user: userObj }, statusCode, message);
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { httpOnly: CookieConfig.HTTP_ONLY, sameSite: CookieConfig.SAME_SITE });
}
