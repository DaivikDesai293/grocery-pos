const { z } = require('zod');
const { emptyToNull, numeric } = require('./common');

const createProductSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(64),
  barcode: emptyToNull(z.string().trim().max(64).nullable().optional()),
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: emptyToNull(z.string().trim().max(1000).nullable().optional()),
  unit: z.string().trim().min(1).max(20).default('each'),
  costPrice: numeric,
  sellPrice: numeric,
  taxRate: numeric.optional().default(0),
  quantityOnHand: numeric.optional().default(0),
  reorderThreshold: numeric.optional().default(0),
  reorderQuantity: numeric.optional().default(0),
  categoryId: emptyToNull(z.string().uuid().nullable().optional()),
  supplierId: emptyToNull(z.string().uuid().nullable().optional()),
});

const updateProductSchema = createProductSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

const listProductsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
// Note: "which products need reordering" is its own endpoint —
// GET /api/reports/reorder — because it compares two columns
// (quantityOnHand vs reorderThreshold), which needs a raw SQL predicate
// rather than a simple Prisma `where` filter. See report.service.js.

const stockAdjustmentSchema = z.object({
  type: z.enum(['RECEIVE', 'ADJUSTMENT', 'WASTE', 'RETURN']),
  // Sign convention: RECEIVE/RETURN always ADD stock — send a positive
  // quantity. WASTE always REMOVES stock — send a positive quantity; the
  // service negates it. ADJUSTMENT applies the signed quantity exactly as
  // sent (positive or negative), for stocktake corrections either way.
  quantity: numeric.refine((v) => v !== 0, 'quantity cannot be zero'),
  note: z.string().trim().max(300).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  stockAdjustmentSchema,
};
