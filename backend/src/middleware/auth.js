const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Requires a valid `Authorization: Bearer <accessToken>` header and attaches
 * the decoded claims to `req.user`. Does not hit the database — the whole
 * point of a short-lived access token is that every request is verified
 * cheaply and locally, with the database only consulted on /auth/refresh.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Access token expired'));
    }
    return next(AppError.unauthorized('Invalid access token'));
  }
}

module.exports = requireAuth;
