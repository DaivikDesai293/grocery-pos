const env = require('../config/env');

/** 404 handler for routes that don't match anything — must be mounted last, before errorHandler. */
function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `No route: ${req.method} ${req.originalUrl}` } });
}

// Prisma's "known request errors" have a stable `.code`. We translate the
// handful that can realistically come from user input into clean 4xx
// responses instead of leaking a 500 + stack trace for a duplicate SKU.
const PRISMA_ERROR_STATUS = {
  P2002: 409, // unique constraint violation
  P2003: 409, // foreign key constraint violation
  P2025: 404, // record to update/delete not found
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.code && PRISMA_ERROR_STATUS[err.code]) {
    statusCode = PRISMA_ERROR_STATUS[err.code];
    if (err.code === 'P2002') {
      const field = err.meta?.target?.join?.(', ') || 'field';
      message = `A record with that ${field} already exists`;
    } else if (err.code === 'P2025') {
      message = 'Record not found';
    } else if (err.code === 'P2003') {
      message = 'This action references a record that does not exist';
    }
  }

  const isUnexpected = statusCode >= 500;
  if (isUnexpected) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (env.isProduction) {
      message = 'Internal server error';
      details = undefined;
    }
  }

  res.status(statusCode).json({ error: { message, details } });
}

module.exports = { errorHandler, notFoundHandler };
