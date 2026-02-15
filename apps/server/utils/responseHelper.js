/**
 * Send a success response
 */
function success(res, data = {}, statusCode = 200, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...extra,
  });
}

/**
 * Send an error response (usually handled by global error middleware)
 */
function error(res, message = "Server Error", statusCode = 500, extra = {}) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...extra,
  });
}

const ResponseHelper = {
  success,
  error,
};

export default ResponseHelper;
