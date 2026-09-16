const { z } = require('zod');
const { emptyToNull } = require('./common');

const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  contactName: emptyToNull(z.string().trim().max(200).nullable().optional()),
  phone: emptyToNull(z.string().trim().max(40).nullable().optional()),
  email: emptyToNull(z.string().trim().toLowerCase().email().nullable().optional()),
  address: emptyToNull(z.string().trim().max(300).nullable().optional()),
});

module.exports = { supplierSchema };
