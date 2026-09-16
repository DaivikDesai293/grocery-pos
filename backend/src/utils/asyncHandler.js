/**
 * Wraps an async Express route handler so a rejected promise (a thrown
 * error inside `await`) is forwarded to `next(err)` instead of crashing
 * the process or hanging the request. Express 4 does not do this for you.
 *
 * Usage: router.get('/x', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
