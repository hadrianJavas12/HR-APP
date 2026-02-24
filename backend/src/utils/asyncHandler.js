/**
 * Wrap async route handlers so errors are forwarded to Express error middleware.
 * @param {Function} fn - Async request handler
 * @returns {Function}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
