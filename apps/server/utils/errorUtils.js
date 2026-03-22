/**
 * Custom Error class for operational errors.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode; // For compatibility with middlewares looking for .status
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
