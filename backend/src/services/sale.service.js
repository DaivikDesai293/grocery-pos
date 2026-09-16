const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { toCents, fromCents, priceLine, priceSale, computeChange } = require('../utils/money');

/**
 * The full checkout flow: price every line server-side from the product
 * catalog (never trust a client-sent price), verify stock, then write the
 * sale + line items + stock decrements + audit trail as one transaction so
 * a crash mid-checkout can never leave stock and sales history disagreeing.
 *
 * @param {object} input  { items, paymentMethod, amountTendered, customerId, discountCents }
 * @param {{id: string, role: string}} cashier  the authenticated user ringing up the sale
 */
async function createSale(input, cashier) {
  const { items, paymentMethod, amountTendered, customerId, discountCents = 0 } = input;

  if (discountCents > 0 && cashier.role === 'CASHIER') {
    throw AppError.forbidden('Only managers and admins can apply a discount');
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw AppError.badRequest('One or more products no longer exist', { productIds: missing });
  }

  const inactiveIds = productIds.filter((id) => !byId.get(id).active);
  if (inactiveIds.length > 0) {
    throw AppError.badRequest('One or more products are inactive and cannot be sold', {
      productIds: inactiveIds,
    });
  }

  // Merge duplicate lines (e.g. the same barcode scanned twice) before checking stock.
  const qtyByProduct = new Map();
  for (const item of items) {
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity);
  }

  const insufficientStock = [];
  const lines = [];
  for (const [productId, quantity] of qtyByProduct) {
    const product = byId.get(productId);
    if (Number(product.quantityOnHand) < quantity) {
      insufficientStock.push({
        productId,
        name: product.name,
        available: Number(product.quantityOnHand),
        requested: quantity,
      });
      continue;
    }
    const unitPriceCents = toCents(product.sellPrice);
    const taxRate = Number(product.taxRate);
    const priced = priceLine(unitPriceCents, quantity, taxRate);
    lines.push({ product, quantity, unitPriceCents, taxRate, ...priced });
  }

  if (insufficientStock.length > 0) {
    throw AppError.conflict('Not enough stock for one or more items', { insufficientStock });
  }

  const totals = priceSale(lines, discountCents);

  let amountTenderedCents = null;
  let changeDueCents = null;
  if (paymentMethod === 'CASH') {
    amountTenderedCents = toCents(amountTendered);
    changeDueCents = computeChange(totals.totalCents, amountTenderedCents);
    if (changeDueCents === null) {
      throw AppError.badRequest(
        `Amount tendered ($${fromCents(amountTenderedCents)}) is less than the total ($${fromCents(
          totals.totalCents
        )})`
      );
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        cashierId: cashier.id,
        customerId: customerId || null,
        subtotal: fromCents(totals.subtotalCents),
        taxTotal: fromCents(totals.taxCents),
        discountTotal: fromCents(totals.discountCents),
        total: fromCents(totals.totalCents),
        paymentMethod,
        amountTendered: amountTenderedCents === null ? null : fromCents(amountTenderedCents),
        changeDue: changeDueCents === null ? null : fromCents(changeDueCents),
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            productName: l.product.name,
            quantity: l.quantity,
            unitPrice: fromCents(l.unitPriceCents),
            taxRate: l.taxRate,
            lineTotal: fromCents(l.totalCents),
          })),
        },
      },
      include: { items: true, cashier: { select: { id: true, name: true } } },
    });

    for (const l of lines) {
      await tx.product.update({
        where: { id: l.product.id },
        data: { quantityOnHand: { decrement: l.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: l.product.id,
          type: 'SALE',
          quantityChange: -l.quantity,
          userId: cashier.id,
          saleId: created.id,
        },
      });
    }

    return created;
  });

  return sale;
}

async function list({ from, to, cashierId, status, page, pageSize }) {
  const where = {
    ...(cashierId ? { cashierId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lt: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.sale.findMany({
      where,
      include: { cashier: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
  ]);

  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

async function getById(id) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      cashier: { select: { id: true, name: true } },
      customer: true,
    },
  });
  if (!sale) throw AppError.notFound('Sale not found');
  return sale;
}

/** Voiding restores stock via the same StockMovement audit trail, tagged RETURN, so the ledger stays honest. */
async function voidSale(id, reason, userId) {
  const sale = await getById(id);
  if (sale.status !== 'COMPLETED') {
    throw AppError.conflict(`Sale is already ${sale.status.toLowerCase()}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.sale.update({
      where: { id },
      data: { status: 'VOIDED', voidReason: reason },
    });

    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantityOnHand: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'RETURN',
          quantityChange: Number(item.quantity),
          userId,
          saleId: id,
          note: `Void: ${reason}`,
        },
      });
    }

    return updated;
  });
}

module.exports = { createSale, list, getById, voidSale };
