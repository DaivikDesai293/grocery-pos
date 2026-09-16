const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

function requireEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // Fail fast and loudly rather than limping along with undefined secrets.
    // eslint-disable-next-line no-console
    console.error(
      `Missing required environment variable(s): ${missing.join(', ')}\n` +
        'Copy backend/.env.example to backend/.env and fill in real values.'
    );
    process.exit(1);
  }
}

requireEnv();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresInDays: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS) || 30,
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@store.test',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
  },
  isProduction: process.env.NODE_ENV === 'production',
};

module.exports = env;
