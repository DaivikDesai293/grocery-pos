const { z } = require('zod');

const roleEnum = z.enum(['ADMIN', 'MANAGER', 'CASHIER']);

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: roleEnum.default('CASHIER'),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: roleEnum.optional(),
    active: z.boolean().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

module.exports = { createUserSchema, updateUserSchema };
