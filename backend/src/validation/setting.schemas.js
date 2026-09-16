const { z } = require('zod');
const { emptyToNull, numeric } = require('./common');

const updateSettingSchema = z.object({
  storeName: z.string().trim().min(1).max(200).optional(),
  address: emptyToNull(z.string().trim().max(300).nullable().optional()),
  phone: emptyToNull(z.string().trim().max(40).nullable().optional()),
  currency: z.string().trim().length(3).optional(),
  defaultTaxRate: numeric.optional(),
  receiptFooter: emptyToNull(z.string().trim().max(300).nullable().optional()),
});

module.exports = { updateSettingSchema };
