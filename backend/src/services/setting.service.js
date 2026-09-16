const prisma = require('../lib/prisma');

/**
 * store_settings is a singleton table — exactly one row. get() creates the
 * default row the first time it's asked for, so there's never a "settings
 * not found" state for the frontend to special-case.
 */
async function get() {
  const existing = await prisma.storeSetting.findFirst();
  if (existing) return existing;
  return prisma.storeSetting.create({ data: {} });
}

async function update(data) {
  const current = await get();
  return prisma.storeSetting.update({ where: { id: current.id }, data });
}

module.exports = { get, update };
