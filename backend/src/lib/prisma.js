const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

// A single shared PrismaClient instance for the whole process. Creating a
// new one per request would exhaust the Postgres connection pool almost
// immediately, so every controller/service should `require` this file
// rather than instantiating PrismaClient itself.
const prisma = new PrismaClient({
  log: env.isProduction ? ['error', 'warn'] : ['error', 'warn'],
});

module.exports = prisma;
