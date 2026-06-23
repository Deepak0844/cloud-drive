/**
 * Custom Error class for operational errors.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Array<{field: string, message: string}>} [errors=[]] - Field-level errors
   */
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode; // For compatibility with middlewares looking for .status
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}
