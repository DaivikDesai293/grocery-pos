/**
 * Seeds a fresh database with a realistic small-grocery-store demo dataset:
 * categories, suppliers, staff logins, ~40 products (a few deliberately
 * low on stock), and ~45 days of sales history ending yesterday — so
 * "today" starts empty and ready for you to try a live checkout.
 *
 * Run with: npm run seed  (after `npx prisma migrate dev`)
 */
// Load backend/.env explicitly (the seed script can be run directly with
// `node prisma/seed.js`, not only through the Prisma CLI, which is the
// only one of the two guaranteed to auto-load it).
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { priceLine, priceSale, toCents, fromCents, computeChange } = require('../src/utils/money');
const { startOfDayInTz, addDaysToYmd, ymdInTz } = require('../src/utils/dateRange');
const {
  mulberry32,
  randInt,
  pickWeighted,
  pickDistinct,
  randomSaleTimeOfDay,
  salesCountForDay,
  basketLineCount,
  lineQuantity,
} = require('./seedHelpers');

const prisma = new PrismaClient();
const TIMEZONE = process.env.STORE_TIMEZONE || 'America/New_York';
const HISTORY_DAYS = 45;
const SEED = 20260101; // fixed seed -> the same demo data every time you reseed

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@store.test';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

const CATEGORY_NAMES = [
  'Produce',
  'Dairy & Eggs',
  'Bakery',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
];

const SUPPLIERS = [
  { name: 'Fresh Farms Co.', contactName: 'Priya Nair', phone: '555-010-1001', email: 'orders@freshfarms.test' },
  { name: 'Dairy Valley Distributors', contactName: 'Tom Becker', phone: '555-010-1002', email: 'sales@dairyvalley.test' },
  { name: 'Golden Wheat Bakery Supply', contactName: 'Elena Cruz', phone: '555-010-1003', email: 'orders@goldenwheat.test' },
  { name: 'Atlantic Seafood & Meat Co.', contactName: 'Marcus Hale', phone: '555-010-1004', email: 'orders@atlanticsm.test' },
  { name: 'National Grocery Wholesale', contactName: 'Dana Kim', phone: '555-010-1005', email: 'orders@ngw.test' },
];

// unit: 'each' | 'kg' | 'lb'. taxRate follows a common US pattern where raw
// produce/dairy/meat/bread are untreated as grocery staples and packaged /
// household / personal-care goods carry sales tax — illustrative only,
// adjust to your own state/province in the admin UI after seeding.
const PRODUCTS = [
  // Produce — Fresh Farms Co.
  { sku: 'PRD-APPLE', name: 'Gala Apples', category: 'Produce', supplier: 0, unit: 'kg', cost: 1.2, sell: 2.99, tax: 0, qty: 60, threshold: 10, reorderQty: 40 },
  { sku: 'PRD-BANANA', name: 'Bananas', category: 'Produce', supplier: 0, unit: 'kg', cost: 0.55, sell: 1.29, tax: 0, qty: 80, threshold: 15, reorderQty: 50 },
  { sku: 'PRD-TOMATO', name: 'Roma Tomatoes', category: 'Produce', supplier: 0, unit: 'kg', cost: 1.8, sell: 3.49, tax: 0, qty: 45, threshold: 10, reorderQty: 30 },
  { sku: 'PRD-CARROT', name: 'Carrots', category: 'Produce', supplier: 0, unit: 'kg', cost: 0.7, sell: 1.79, tax: 0, qty: 50, threshold: 10, reorderQty: 30 },
  { sku: 'PRD-LETTUCE', name: 'Iceberg Lettuce', category: 'Produce', supplier: 0, unit: 'each', cost: 0.9, sell: 1.99, tax: 0, qty: 40, threshold: 8, reorderQty: 25 },
  { sku: 'PRD-AVOCADO', name: 'Avocados', category: 'Produce', supplier: 0, unit: 'each', cost: 0.6, sell: 1.49, tax: 0, qty: 70, threshold: 15, reorderQty: 40 },
  // Dairy & Eggs — Dairy Valley Distributors
  { sku: 'DRY-MILKWH', name: 'Whole Milk 1L', category: 'Dairy & Eggs', supplier: 1, unit: 'each', cost: 1.0, sell: 2.49, tax: 0, qty: 90, threshold: 20, reorderQty: 60 },
  { sku: 'DRY-MILK2P', name: '2% Milk 1L', category: 'Dairy & Eggs', supplier: 1, unit: 'each', cost: 1.0, sell: 2.49, tax: 0, qty: 70, threshold: 20, reorderQty: 60 },
  { sku: 'DRY-EGGS12', name: 'Large Eggs (dozen)', category: 'Dairy & Eggs', supplier: 1, unit: 'each', cost: 2.1, sell: 3.99, tax: 0, qty: 60, threshold: 15, reorderQty: 40 },
  { sku: 'DRY-CHEDDAR', name: 'Cheddar Cheese Block 400g', category: 'Dairy & Eggs', supplier: 1, unit: 'each', cost: 3.2, sell: 5.99, tax: 0.0825, qty: 30, threshold: 8, reorderQty: 20 },
  { sku: 'DRY-YOGURT', name: 'Greek Yogurt 500g', category: 'Dairy & Eggs', supplier: 1, unit: 'each', cost: 2.0, sell: 3.79, tax: 0, qty: 40, threshold: 10, reorderQty: 25 },
  { sku: 'DRY-BUTTER', name: 'Salted Butter 454g', category: 'Dairy & Eggs', supplier: 1, unit: 'each', cost: 2.5, sell: 4.49, tax: 0, qty: 35, threshold: 8, reorderQty: 20 },
  // Bakery — Golden Wheat Bakery Supply
  { sku: 'BKY-WHITE', name: 'White Sandwich Bread', category: 'Bakery', supplier: 2, unit: 'each', cost: 1.3, sell: 2.79, tax: 0, qty: 30, threshold: 8, reorderQty: 20 },
  { sku: 'BKY-WHEAT', name: 'Whole Wheat Bread', category: 'Bakery', supplier: 2, unit: 'each', cost: 1.4, sell: 2.99, tax: 0, qty: 25, threshold: 8, reorderQty: 20 },
  { sku: 'BKY-BAGEL6', name: 'Bagels 6-pack', category: 'Bakery', supplier: 2, unit: 'each', cost: 1.8, sell: 3.49, tax: 0, qty: 20, threshold: 6, reorderQty: 15, forceLow: true },
  { sku: 'BKY-CROIS4', name: 'Croissants 4-pack', category: 'Bakery', supplier: 2, unit: 'each', cost: 2.2, sell: 4.29, tax: 0.0825, qty: 15, threshold: 5, reorderQty: 12, forceLow: true },
  // Meat & Seafood — Atlantic Seafood & Meat Co.
  { sku: 'MET-CHICKB', name: 'Chicken Breast', category: 'Meat & Seafood', supplier: 3, unit: 'kg', cost: 5.5, sell: 8.99, tax: 0, qty: 25, threshold: 6, reorderQty: 15 },
  { sku: 'MET-BEEF80', name: 'Ground Beef 80/20', category: 'Meat & Seafood', supplier: 3, unit: 'kg', cost: 6.2, sell: 9.49, tax: 0, qty: 20, threshold: 5, reorderQty: 15 },
  { sku: 'MET-SALMON', name: 'Atlantic Salmon Fillet', category: 'Meat & Seafood', supplier: 3, unit: 'kg', cost: 12.0, sell: 17.99, tax: 0, qty: 12, threshold: 4, reorderQty: 10, forceLow: true },
  { sku: 'MET-BACON', name: 'Bacon 500g', category: 'Meat & Seafood', supplier: 3, unit: 'each', cost: 3.8, sell: 6.49, tax: 0.0825, qty: 25, threshold: 6, reorderQty: 15 },
  // Pantry — National Grocery Wholesale
  { sku: 'PNT-RICE2K', name: 'Long Grain Rice 2kg', category: 'Pantry', supplier: 4, unit: 'each', cost: 2.6, sell: 4.49, tax: 0.0825, qty: 40, threshold: 8, reorderQty: 20 },
  { sku: 'PNT-PENNE', name: 'Penne Pasta 500g', category: 'Pantry', supplier: 4, unit: 'each', cost: 0.9, sell: 1.79, tax: 0.0825, qty: 60, threshold: 12, reorderQty: 35 },
  { sku: 'PNT-MARINA', name: 'Marinara Pasta Sauce 680ml', category: 'Pantry', supplier: 4, unit: 'each', cost: 1.6, sell: 2.99, tax: 0.0825, qty: 45, threshold: 10, reorderQty: 25 },
  { sku: 'PNT-OLIVEO', name: 'Extra Virgin Olive Oil 1L', category: 'Pantry', supplier: 4, unit: 'each', cost: 5.5, sell: 9.99, tax: 0.0825, qty: 20, threshold: 5, reorderQty: 12 },
  { sku: 'PNT-PEANUT', name: 'Peanut Butter 500g', category: 'Pantry', supplier: 4, unit: 'each', cost: 2.3, sell: 3.99, tax: 0.0825, qty: 30, threshold: 8, reorderQty: 18 },
  { sku: 'PNT-SUGAR2', name: 'Granulated Sugar 2kg', category: 'Pantry', supplier: 4, unit: 'each', cost: 1.7, sell: 2.99, tax: 0.0825, qty: 35, threshold: 8, reorderQty: 20 },
  { sku: 'PNT-FLOUR', name: 'All-Purpose Flour 2.5kg', category: 'Pantry', supplier: 4, unit: 'each', cost: 2.1, sell: 3.49, tax: 0.0825, qty: 30, threshold: 6, reorderQty: 18 },
  // Frozen — National Grocery Wholesale
  { sku: 'FRZ-VEGMIX', name: 'Frozen Mixed Vegetables 900g', category: 'Frozen', supplier: 4, unit: 'each', cost: 1.9, sell: 3.29, tax: 0.0825, qty: 35, threshold: 8, reorderQty: 20 },
  { sku: 'FRZ-PIZZA', name: 'Frozen Pepperoni Pizza', category: 'Frozen', supplier: 4, unit: 'each', cost: 3.2, sell: 5.99, tax: 0.0825, qty: 25, threshold: 6, reorderQty: 15 },
  { sku: 'FRZ-ICECRM', name: 'Vanilla Ice Cream 1.5L', category: 'Frozen', supplier: 4, unit: 'each', cost: 3.0, sell: 5.49, tax: 0.0825, qty: 20, threshold: 5, reorderQty: 12 },
  // Beverages — National Grocery Wholesale
  { sku: 'BEV-OJ175', name: 'Orange Juice 1.75L', category: 'Beverages', supplier: 4, unit: 'each', cost: 2.4, sell: 4.29, tax: 0, qty: 30, threshold: 8, reorderQty: 18 },
  { sku: 'BEV-COFFEE', name: 'Ground Coffee 340g', category: 'Beverages', supplier: 4, unit: 'each', cost: 4.5, sell: 7.99, tax: 0.0825, qty: 25, threshold: 6, reorderQty: 15, forceLow: true },
  { sku: 'BEV-SPARK12', name: 'Sparkling Water 12-pack', category: 'Beverages', supplier: 4, unit: 'each', cost: 3.6, sell: 5.99, tax: 0.0825, qty: 30, threshold: 8, reorderQty: 18 },
  { sku: 'BEV-COLA12', name: 'Cola 12-pack Cans', category: 'Beverages', supplier: 4, unit: 'each', cost: 4.2, sell: 6.99, tax: 0.0825, qty: 35, threshold: 8, reorderQty: 20 },
  // Snacks — National Grocery Wholesale
  { sku: 'SNK-CHIPS', name: 'Tortilla Chips 300g', category: 'Snacks', supplier: 4, unit: 'each', cost: 1.8, sell: 3.29, tax: 0.0825, qty: 30, threshold: 8, reorderQty: 18 },
  { sku: 'SNK-NUTS', name: 'Mixed Nuts 250g', category: 'Snacks', supplier: 4, unit: 'each', cost: 3.1, sell: 5.49, tax: 0.0825, qty: 20, threshold: 5, reorderQty: 12, forceLow: true },
  // Household — National Grocery Wholesale
  { sku: 'HHD-PAPTWL', name: 'Paper Towels 6-roll', category: 'Household', supplier: 4, unit: 'each', cost: 5.2, sell: 8.99, tax: 0.0825, qty: 25, threshold: 6, reorderQty: 15 },
  { sku: 'HHD-DISHSP', name: 'Dish Soap 500ml', category: 'Household', supplier: 4, unit: 'each', cost: 1.6, sell: 2.99, tax: 0.0825, qty: 30, threshold: 8, reorderQty: 18 },
  // Personal Care — National Grocery Wholesale
  { sku: 'PCR-TOOTHP', name: 'Toothpaste 100ml', category: 'Personal Care', supplier: 4, unit: 'each', cost: 1.4, sell: 2.79, tax: 0.0825, qty: 25, threshold: 6, reorderQty: 15 },
  { sku: 'PCR-SOAP3', name: 'Bar Soap 3-pack', category: 'Personal Care', supplier: 4, unit: 'each', cost: 1.9, sell: 3.49, tax: 0.0825, qty: 20, threshold: 5, reorderQty: 12 },
];

function barcodeFor(index) {
  return `6${String(index + 1).padStart(11, '0')}`;
}

function localDateTimeToUtc(ymd, hour, minute, second, timeZone) {
  const midnightUtc = startOfDayInTz(ymd, timeZone);
  return new Date(midnightUtc.getTime() + ((hour * 60 + minute) * 60 + second) * 1000);
}

async function main() {
  const existingProduct = await prisma.product.findFirst();
  if (existingProduct) {
    console.log('Database already has products — skipping seed (nothing was changed).');
    console.log('To reseed from scratch, drop and recreate the database, then rerun `npx prisma migrate dev` and `npm run seed`.');
    return;
  }

  console.log(`Seeding demo data (store timezone: ${TIMEZONE})...`);

  await prisma.storeSetting.create({
    data: {
      storeName: 'Corner Grocery',
      address: '123 Main Street',
      currency: 'USD',
      defaultTaxRate: 0.0825,
      receiptFooter: 'Thanks for shopping with us!',
    },
  });

  const categories = {};
  for (const name of CATEGORY_NAMES) {
    categories[name] = await prisma.category.create({ data: { name } });
  }

  const suppliers = [];
  for (const s of SUPPLIERS) {
    suppliers.push(await prisma.supplier.create({ data: s }));
  }

  const adminPasswordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  const demoPasswordHash = await bcrypt.hash('Demo1234!', 10);

  const admin = await prisma.user.create({
    data: { name: 'Alex Admin', email: SEED_ADMIN_EMAIL, passwordHash: adminPasswordHash, role: 'ADMIN' },
  });
  const manager = await prisma.user.create({
    data: { name: 'Morgan Manager', email: 'manager@store.test', passwordHash: demoPasswordHash, role: 'MANAGER' },
  });
  const cathy = await prisma.user.create({
    data: { name: 'Cathy Cashier', email: 'cathy@store.test', passwordHash: demoPasswordHash, role: 'CASHIER' },
  });
  const sam = await prisma.user.create({
    data: { name: 'Sam Cashier', email: 'sam@store.test', passwordHash: demoPasswordHash, role: 'CASHIER' },
  });
  console.log(`Created 4 users. Admin: ${SEED_ADMIN_EMAIL} / (your SEED_ADMIN_PASSWORD). Everyone else: Demo1234!`);

  const products = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const created = await prisma.product.create({
      data: {
        sku: p.sku,
        barcode: barcodeFor(i),
        name: p.name,
        unit: p.unit,
        costPrice: p.cost,
        sellPrice: p.sell,
        taxRate: p.tax,
        quantityOnHand: p.qty,
        reorderThreshold: p.threshold,
        reorderQuantity: p.reorderQty,
        categoryId: categories[p.category].id,
        supplierId: suppliers[p.supplier].id,
      },
    });
    products.push({ ...created, forceLow: Boolean(p.forceLow) });
  }
  console.log(`Created ${products.length} products across ${CATEGORY_NAMES.length} categories.`);

  // --- Sales history: the last HISTORY_DAYS full days, ending yesterday ---
  // (today is left empty on purpose, so a live checkout has an obvious effect)
  const rand = mulberry32(SEED);
  const cashierPool = [
    { user: cathy, weight: 6 },
    { user: sam, weight: 6 },
    { user: manager, weight: 1 },
  ];
  const stock = new Map(products.map((p) => [p.id, Number(p.quantityOnHand)]));
  // The level a delivery tops a product back up to — a real store restocks
  // regularly, so a 45-day simulation needs that too, or everything would
  // sell out partway through and the back half of the history would go
  // artificially quiet.
  const parLevel = new Map(
    products.map((p) => [p.id, Math.max(Number(p.quantityOnHand), Number(p.reorderThreshold) * 3)])
  );

  const todayYmd = ymdInTz(new Date(), TIMEZONE);
  let saleCount = 0;
  let restockCount = 0;

  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo--) {
    const dayYmd = addDaysToYmd(todayYmd, -daysAgo);
    const weekday = new Date(Date.UTC(dayYmd.year, dayYmd.month - 1, dayYmd.day)).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const salesToday = salesCountForDay(rand, isWeekend);

    // A delivery truck effectively arrives every few days: anything running
    // low gets topped back up to its par level before that day's sales.
    if (daysAgo % 4 === 0) {
      for (const product of products) {
        const current = stock.get(product.id);
        const par = parLevel.get(product.id);
        if (current < par * 0.4) {
          const receiveQty = Math.round((par - current) * 1000) / 1000;
          stock.set(product.id, par);
          const receivedAt = localDateTimeToUtc(dayYmd, randInt(rand, 6, 8), randInt(rand, 0, 59), 0, TIMEZONE);
          await prisma.stockMovement.create({
            data: {
              productId: product.id,
              type: 'RECEIVE',
              quantityChange: receiveQty,
              note: 'Scheduled delivery',
              userId: manager.id,
              createdAt: receivedAt,
            },
          });
          restockCount++;
        }
      }
    }

    for (let s = 0; s < salesToday; s++) {
      const available = products.filter((p) => stock.get(p.id) >= (p.unit === 'kg' || p.unit === 'lb' ? 0.2 : 1));
      if (available.length === 0) break;

      const lineCount = Math.min(basketLineCount(rand), available.length);
      const basketProducts = pickDistinct(rand, available, lineCount);

      const lines = [];
      for (const product of basketProducts) {
        const stockLeft = stock.get(product.id);
        const quantity = lineQuantity(rand, product.unit, stockLeft);
        if (quantity <= 0) continue;
        const unitPriceCents = toCents(product.sellPrice);
        const priced = priceLine(unitPriceCents, quantity, Number(product.taxRate));
        lines.push({ product, quantity, unitPriceCents, taxRate: Number(product.taxRate), ...priced });
        stock.set(product.id, Math.round((stockLeft - quantity) * 1000) / 1000);
      }
      if (lines.length === 0) continue;

      const totals = priceSale(lines, 0);
      const cashierUser = pickWeighted(rand, cashierPool.map((c) => ({ value: c.user, weight: c.weight })));
      const isCash = rand() < 0.8;
      const { hour, minute, second } = randomSaleTimeOfDay(rand);
      const createdAt = localDateTimeToUtc(dayYmd, hour, minute, second, TIMEZONE);

      let amountTenderedCents = null;
      let changeDueCents = null;
      if (isCash) {
        const roundUpTo = totals.totalCents % 100 === 0 ? totals.totalCents : Math.ceil(totals.totalCents / 100) * 100;
        amountTenderedCents = roundUpTo + randInt(rand, 0, 3) * 500;
        changeDueCents = computeChange(totals.totalCents, amountTenderedCents);
      }

      await prisma.sale.create({
        data: {
          cashierId: cashierUser.id,
          subtotal: fromCents(totals.subtotalCents),
          taxTotal: fromCents(totals.taxCents),
          discountTotal: 0,
          total: fromCents(totals.totalCents),
          paymentMethod: isCash ? 'CASH' : 'CARD',
          amountTendered: amountTenderedCents === null ? null : fromCents(amountTenderedCents),
          changeDue: changeDueCents === null ? null : fromCents(changeDueCents),
          createdAt,
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
          stockMovements: {
            create: lines.map((l) => ({
              productId: l.product.id,
              type: 'SALE',
              quantityChange: -l.quantity,
              userId: cashierUser.id,
              createdAt,
            })),
          },
        },
      });
      saleCount++;
    }

    if (daysAgo % 10 === 0) console.log(`  ...generated sales through ${daysAgo} days ago`);
  }

  // Persist the simulated stock levels, then force a handful of products
  // low so the reorder report has reliable, obvious demo data.
  for (const product of products) {
    const finalQty = product.forceLow
      ? Math.min(1 + Math.floor(rand() * 3), product.reorderThreshold)
      : stock.get(product.id);
    await prisma.product.update({ where: { id: product.id }, data: { quantityOnHand: finalQty } });
  }

  console.log(`Created ${saleCount} historical sales over the last ${HISTORY_DAYS} days.`);
  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
