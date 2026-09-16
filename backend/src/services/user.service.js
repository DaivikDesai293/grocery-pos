const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { publicUser } = require('./auth.service');

const SALT_ROUNDS = 10;

async function list() {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  return users.map(publicUser);
}

async function create({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });
  return publicUser(user);
}

async function update(id, data) {
  const patch = { ...data };
  if (patch.password) {
    patch.passwordHash = await bcrypt.hash(patch.password, SALT_ROUNDS);
    delete patch.password;
  }
  const user = await prisma.user.update({ where: { id }, data: patch });
  return publicUser(user);
}

/** Users are deactivated, never hard-deleted — their sales/audit history must survive. */
async function deactivate(id, requestingUserId) {
  if (id === requestingUserId) {
    throw AppError.badRequest('You cannot deactivate your own account');
  }
  const user = await prisma.user.update({ where: { id }, data: { active: false } });
  return publicUser(user);
}

module.exports = { list, create, update, deactivate };
