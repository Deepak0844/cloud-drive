/**
 * Send a success response
 */
function success(res, data = {}, statusCode = 200, extra = {}) {
  const response = {
    success: true,
    data,
    ...extra,
  };

  // If data structure contains pagination (from paginateQuery utility), move it to top level
  if (data && data.pagination && data.data) {
    response.data = data.data;
    response.pagination = data.pagination;
  }

  return res.status(statusCode).json(response);
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

const ResponseUtils = {
  success,
  error,
};

export default ResponseUtils;
