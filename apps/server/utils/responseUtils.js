/**
 * Send a success response
 */
function success(res, data = {}, statusCode = 200, message = "Success") {
  const response = {
    success: true,
    message,
    data,
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
function error(res, message = "An error occurred", statusCode = 500, errors = []) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

const ResponseUtils = {
  success,
  error,
};

export default ResponseUtils;
