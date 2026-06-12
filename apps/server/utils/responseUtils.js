/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {string} message
 * @property {*} [data]
 * @property {Object} [pagination] - Present when data originates from paginateQuery
 * @property {number} [pagination.total]
 * @property {number} [pagination.page]
 * @property {number} [pagination.ps]
 * @property {number} [pagination.pages]
 * @property {boolean} [pagination.hasNext]
 * @property {boolean} [pagination.hasPrev]
 * @property {Array} [errors] - Present on error responses
 */

/**
 * Send a success response. When `data` contains a `pagination` key (from paginateQuery),
 * `data` and `pagination` are promoted to the response top level.
 *
 * @param {import('express').Response} res
 * @param {*} [data={}]
 * @param {number} [statusCode=200]
 * @param {string} [message="Success"]
 * @returns {ApiResponse}
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
 * Send an error response (usually handled by global error middleware).
 *
 * @param {import('express').Response} res
 * @param {string} [message="An error occurred"]
 * @param {number} [statusCode=500]
 * @param {Array} [errors=[]]
 * @returns {ApiResponse}
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
