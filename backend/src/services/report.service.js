const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const {
  resolveRangePreset,
  resolveCustomRange,
  dailyBucketLabels,
  ymdInTz,
  ymdToLabel,
} = require('../utils/dateRange');
const { suggestReorder } = require('../utils/reorder');

// The timezone every "today"/"this week"/etc. report is evaluated in. A
// single-location store sets this once; see backend/.env.example.
const STORE_TIMEZONE = process.env.STORE_TIMEZONE || 'America/New_York';
const VELOCITY_WINDOW_DAYS = 30;

function resolveRange({ preset, from, to }) {
  if (preset) return resolveRangePreset(preset, STORE_TIMEZONE);
  if (from && to) return resolveCustomRange(from, to, STORE_TIMEZONE);
  throw AppError.badRequest('Provide either ?preset= or both ?from= and ?to=');
}

async function summary(query) {
  const { from, to } = resolveRange(query);
  const agg = await prisma.sale.aggregate({
    where: { status: 'COMPLETED', createdAt: { gte: from, lt: to } },
    _sum: { total: true, subtotal: true, taxTotal: true, discountTotal: true },
    _count: { _all: true },
    _avg: { total: true },
  });

  return {
    from,
    to,
    saleCount: agg._count._all,
    revenue: Number(agg._sum.total || 0),
    subtotal: Number(agg._sum.subtotal || 0),
    tax: Number(agg._sum.taxTotal || 0),
    discount: Number(agg._sum.discountTotal || 0),
    averageBasket: agg._count._all > 0 ? Number(agg._avg.total || 0) : 0,
  };
}

/**
 * Daily revenue for a chart. Bucketing happens in JS (not SQL `date_trunc`)
 * so it uses the exact same DST-aware local-day logic as every other
 * report — one definition of "what day is this sale in," tested once in
 * dateRange.test.js, instead of two implementations that could disagree.
 */
async function trend(query) {
  const { from, to } = resolveRange(query);
  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: from, lt: to } },
    select: { total: true, createdAt: true },
  });

  const buckets = new Map();
  for (const ymd of dailyBucketLabels(from, to, STORE_TIMEZONE)) {
    const label = ymdToLabel(ymd);
    buckets.set(label, { date: label, revenue: 0, saleCount: 0 });
  }
  for (const sale of sales) {
    const label = ymdToLabel(ymdInTz(sale.createdAt, STORE_TIMEZONE));
    const bucket = buckets.get(label);
    if (bucket) {
      bucket.revenue += Number(sale.total);
      bucket.saleCount += 1;
    }
  }

  return { from, to, days: [...buckets.values()] };
}

async function topProducts(query) {
  const { from, to, limit = 10 } = query;
  const { from: rangeFrom, to: rangeTo } = resolveRange(query);

  const grouped = await prisma.saleItem.groupBy({
    by: ['productId', 'productName'],
    where: { sale: { status: 'COMPLETED', createdAt: { gte: rangeFrom, lt: rangeTo } } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: 'desc' } },
    take: limit,
  });

  return grouped.map((g) => ({
    productId: g.productId,
    productName: g.productName,
    quantitySold: Number(g._sum.quantity || 0),
    revenue: Number(g._sum.lineTotal || 0),
  }));
}

async function byCategory(query) {
  const { from, to } = resolveRange(query);
  const rows = await prisma.saleItem.findMany({
    where: { sale: { status: 'COMPLETED', createdAt: { gte: from, lt: to } } },
    select: {
      lineTotal: true,
      quantity: true,
      product: { select: { categoryId: true, category: { select: { name: true } } } },
    },
  });

  const map = new Map();
  for (const row of rows) {
    const key = row.product.categoryId || 'uncategorized';
    const name = row.product.category?.name || 'Uncategorized';
    if (!map.has(key)) {
      map.set(key, { categoryId: row.product.categoryId, name, revenue: 0, quantitySold: 0 });
    }
    const bucket = map.get(key);
    bucket.revenue += Number(row.lineTotal);
    bucket.quantitySold += Number(row.quantity);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

async function byCashier(query) {
  const { from, to } = resolveRange(query);
  const grouped = await prisma.sale.groupBy({
    by: ['cashierId'],
    where: { status: 'COMPLETED', createdAt: { gte: from, lt: to } },
    _sum: { total: true },
    _count: { _all: true },
    orderBy: { _sum: { total: 'desc' } },
  });

  if (grouped.length === 0) return [];

  const cashiers = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.cashierId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(cashiers.map((c) => [c.id, c.name]));

  return grouped.map((g) => ({
    cashierId: g.cashierId,
    cashierName: nameById.get(g.cashierId) || 'Former employee',
    revenue: Number(g._sum.total || 0),
    saleCount: g._count._all,
  }));
}

/**
 * "What do I need to order?" — products at/under their reorder threshold,
 * each with a suggested quantity sized from real recent sales velocity
 * where we have it (see utils/reorder.js), falling back to the product's
 * own configured reorder quantity otherwise.
 */
async function reorderReport() {
  const lowStock = await prisma.$queryRaw`
    SELECT id, sku, barcode, name, unit,
           quantity_on_hand, reorder_threshold, reorder_quantity
    FROM products
    WHERE active = true AND quantity_on_hand <= reorder_threshold
    ORDER BY name ASC
  `;

  if (lowStock.length === 0) return [];

  const ids = lowStock.map((p) => p.id);
  const since = new Date(Date.now() - VELOCITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const salesAgg = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { productId: { in: ids }, sale: { status: 'COMPLETED', createdAt: { gte: since } } },
    _sum: { quantity: true },
  });
  const soldById = new Map(salesAgg.map((s) => [s.productId, Number(s._sum.quantity || 0)]));

  return lowStock.map((p) => {
    const avgDailySales = (soldById.get(p.id) || 0) / VELOCITY_WINDOW_DAYS;
    const suggestion = suggestReorder({
      quantityOnHand: Number(p.quantity_on_hand),
      reorderThreshold: Number(p.reorder_threshold),
      reorderQuantity: Number(p.reorder_quantity),
      avgDailySales,
    });
    return {
      productId: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      unit: p.unit,
      quantityOnHand: Number(p.quantity_on_hand),
      reorderThreshold: Number(p.reorder_threshold),
      avgDailySales: Math.round(avgDailySales * 100) / 100,
      ...suggestion,
    };
  });
}

module.exports = {
  STORE_TIMEZONE,
  resolveRange,
  summary,
  trend,
  topProducts,
  byCategory,
  byCashier,
  reorderReport,
};
