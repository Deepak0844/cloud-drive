/**
 * Simple wrapper to catch errors in async express routes
 * eliminating the need for try/catch blocks in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
