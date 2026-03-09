import config from "#config/env.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

/**
 * Helper to get token from model and send response
 */
export function sendTokenResponse(user, statusCode, res, message) {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ...(config.NODE_ENV === "production" && { secure: true }),
  };

  res.cookie("token", token, cookieOptions);

  return ResponseUtils.success(
    res,
    { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    statusCode,
    message
  );
}
