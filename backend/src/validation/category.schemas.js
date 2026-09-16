const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
});

module.exports = { categorySchema };
