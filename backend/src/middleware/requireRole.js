const AppError = require('../utils/AppError');

/**
 * Role-based access control. Must run after `requireAuth`.
 *
 *   router.post('/products', requireAuth, requireRole('ADMIN', 'MANAGER'), ...)
 *
 * Roles are a strict hierarchy for POS purposes: ADMIN can do everything a
 * MANAGER can, and MANAGER can do everything a CASHIER can. We still list
 * roles explicitly at each route (rather than a numeric "at least" check)
 * because that makes every route's access policy readable on its own line.
 */
const RANK = { CASHIER: 1, MANAGER: 2, ADMIN: 3 };

function requireRole(...allowedRoles) {
  const minRank = Math.min(...allowedRoles.map((r) => RANK[r] ?? Infinity));

  return function roleCheck(req, res, next) {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    const userRank = RANK[req.user.role] ?? 0;
    if (userRank < minRank) {
      return next(AppError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = requireRole;
