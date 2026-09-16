const { z } = require('zod');

const presetEnum = z.enum(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_30_days']);
const ymdRegex = /^\d{4}-\d{2}-\d{2}$/;

const rangeShape = {
  preset: presetEnum.optional(),
  from: z.string().regex(ymdRegex, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(ymdRegex, 'to must be YYYY-MM-DD').optional(),
};

const rangeRefinement = (d) => Boolean(d.preset) || Boolean(d.from && d.to);
const rangeRefinementOpts = { message: 'Provide either ?preset= or both ?from= and ?to= (YYYY-MM-DD)' };

const rangeQuerySchema = z.object(rangeShape).refine(rangeRefinement, rangeRefinementOpts);

const topProductsQuerySchema = z
  .object({ ...rangeShape, limit: z.coerce.number().int().min(1).max(50).optional().default(10) })
  .refine(rangeRefinement, rangeRefinementOpts);

module.exports = { rangeQuerySchema, topProductsQuerySchema };
