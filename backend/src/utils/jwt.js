const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const env = require('../config/env');

/** Signs a short-lived access token carrying the minimum claims routes need. */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/**
 * Refresh tokens are opaque random strings, NOT JWTs — we store only a
 * SHA-256 hash of the token in the database, so a leaked database dump
 * can't be replayed as a valid session (same principle as password hashing,
 * cheaper than bcrypt because the token itself is already high-entropy).
 */
function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(
    Date.now() + env.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000
  );
  return { token, tokenHash, expiresAt };
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
