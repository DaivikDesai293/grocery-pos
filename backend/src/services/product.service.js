const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');

async function list({ search, categoryId, supplierId, includeInactive, page, pageSize }) {
  const where = {
    ...(includeInactive ? {} : { active: true }),
    ...(categoryId ? { categoryId } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

async function getById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, supplier: true },
  });
  if (!product) throw AppError.notFound('Product not found');
  return product;
}

/** Used by the POS checkout screen when a barcode scanner "types" a code into the search box. */
async function getByBarcode(barcode) {
  const product = await prisma.product.findUnique({
    where: { barcode },
    include: { category: true, supplier: true },
  });
  if (!product || !product.active) throw AppError.notFound('No active product with that barcode');
  return product;
}

async function create(data) {
  return prisma.product.create({ data });
}

async function update(id, data) {
  return prisma.product.update({ where: { id }, data });
}

/** Products with sale history are never hard-deleted — deactivate them (PATCH active:false) instead. */
async function remove(id) {
  const hasSales = await prisma.saleItem.findFirst({ where: { productId: id } });
  if (hasSales) {
    throw AppError.conflict(
      'This product has sale history and cannot be deleted. Deactivate it instead so past receipts stay intact.'
    );
  }
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw AppError.notFound('Product not found');
  await prisma.product.delete({ where: { id } });
}

function computeSignedChange(type, quantity) {
  const magnitude = Math.abs(quantity);
  switch (type) {
    case 'RECEIVE':
    case 'RETURN':
      return magnitude;
    case 'WASTE':
      return -magnitude;
    case 'ADJUSTMENT':
      return quantity;
    default:
      throw AppError.badRequest('Unsupported stock movement type');
  }
}

async function adjustStock(id, { type, quantity, note }, userId) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw AppError.notFound('Product not found');

  const signedChange = computeSignedChange(type, quantity);
  const newQuantity = Number(product.quantityOnHand) + signedChange;
  if (newQuantity < 0) {
    throw AppError.badRequest(
      `That would take "${product.name}" below zero stock (currently ${product.quantityOnHand}).`
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { quantityOnHand: newQuantity } }),
    prisma.stockMovement.create({
      data: { productId: id, type, quantityChange: signedChange, note, userId },
    }),
  ]);
  return updated;
}

async function stockHistory(id, take = 50) {
  return prisma.stockMovement.findMany({
    where: { productId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

module.exports = {
  list,
  getById,
  getByBarcode,
  create,
  update,
  remove,
  adjustStock,
  stockHistory,
};
