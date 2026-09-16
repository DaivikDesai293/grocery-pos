const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');

async function list() {
  return prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

async function create(data) {
  return prisma.supplier.create({ data });
}

async function update(id, data) {
  return prisma.supplier.update({ where: { id }, data });
}

async function remove(id) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw AppError.notFound('Supplier not found');
  await prisma.supplier.delete({ where: { id } });
}

module.exports = { list, create, update, remove };
