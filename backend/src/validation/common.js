const { z } = require('zod');

/** Treats an empty-string form field as "not provided" instead of an actual value. */
function emptyToNull(schema) {
  return z.preprocess((v) => (v === '' ? null : v), schema);
}

/** Accepts a number or numeric string (form inputs often send strings) and yields a finite number. */
const numeric = z
  .union([z.number(), z.string().trim().min(1)])
  .transform((v) => Number(v))
  .pipe(z.number({ invalid_type_error: 'Must be a number' }).finite('Must be a finite number'));

module.exports = { emptyToNull, numeric };
