const { z } = require('zod');

const saleItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  quantity: z.number().positive('Quantity must be greater than zero'),
});

const createSaleSchema = z
  .object({
    items: z.array(saleItemInputSchema).min(1, 'A sale needs at least one item'),
    paymentMethod: z.enum(['CASH', 'CARD', 'OTHER']),
    amountTendered: z.number().nonnegative().optional(),
    customerId: z.string().uuid().optional().nullable(),
    discountCents: z.number().int().min(0).max(100_000_00).optional().default(0),
  })
  .refine((data) => data.paymentMethod !== 'CASH' || typeof data.amountTendered === 'number', {
    message: 'amountTendered is required for cash payments',
    path: ['amountTendered'],
  });

const voidSaleSchema = z.object({
  reason: z.string().trim().min(1, 'A void reason is required').max(300),
});

const listSalesQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cashierId: z.string().uuid().optional(),
  status: z.enum(['COMPLETED', 'VOIDED', 'REFUNDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

module.exports = { createSaleSchema, voidSaleSchema, listSalesQuerySchema };
