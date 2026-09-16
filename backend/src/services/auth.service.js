const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} = require('../utils/jwt');

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return { accessToken, refreshToken };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for "no such user" and "wrong password" — don't help an
  // attacker enumerate valid emails. Run bcrypt.compare even when the user
  // doesn't exist so the response time doesn't leak that fact either.
  const passwordHash = user?.passwordHash ?? '$2a$10$invalidsaltinvalidsaltinvalidsalt.hash';
  const valid = await bcrypt.compare(password, passwordHash);

  if (!user || !valid) {
    throw AppError.unauthorized('Invalid email or password');
  }
  if (!user.active) {
    throw AppError.forbidden('This account has been deactivated');
  }

  const tokens = await issueTokenPair(user);
  return { ...tokens, user: publicUser(user) };
}

async function refresh(refreshToken) {
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token is invalid or expired');
  }
  if (!stored.user.active) {
    throw AppError.forbidden('This account has been deactivated');
  }

  // Rotate: revoke the used token and issue a brand new pair. If a revoked
  // token is ever presented again, that's a strong signal it was stolen and
  // replayed — a production system would revoke the whole family here.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(stored.user);
  return { ...tokens, user: publicUser(stored.user) };
}

async function logout(refreshToken) {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function getById(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    throw AppError.unauthorized();
  }
  return publicUser(user);
}

module.exports = { login, refresh, logout, getById, publicUser };
