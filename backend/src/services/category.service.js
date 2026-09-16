const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');

async function list() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

async function create(data) {
  return prisma.category.create({ data });
}

async function update(id, data) {
  return prisma.category.update({ where: { id }, data });
}

async function remove(id) {
  // Products keep their category set to NULL (see onDelete: SetNull in schema) —
  // deleting a category never deletes or breaks the products in it.
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw AppError.notFound('Category not found');
  await prisma.category.delete({ where: { id } });
}

module.exports = { list, create, update, remove };
