const AppError = require('../utils/AppError');

/**
 * Validates `req[source]` against a Zod schema and replaces it with the
 * parsed (and thus coerced/defaulted) value. Rejects with a 400 listing
 * every field error at once, rather than one-at-a-time trial and error.
 *
 *   router.post('/products', validate(createProductSchema), ...)
 *   router.get('/products', validate(listProductsSchema, 'query'), ...)
 */
function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(AppError.badRequest('Validation failed', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
