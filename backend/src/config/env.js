const path = require('path');

// Always read backend/.env (not whatever folder pm2/the shell was started
// from), and let it win over variables pm2 may have cached from an earlier
// start — otherwise edits to .env can silently have no effect after
// `pm2 restart`.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), override: true });

function parseList(value, fallback = []) {
  if (!value) return fallback;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5002', 10),
  // Used only for the friendly startup banner in server.js — has zero effect
  // on how the server actually listens. Set PUBLIC_URL in .env to the real
  // public address once you have one (e.g. https://chat.dishaestate.com:3001).
  publicUrl: process.env.PUBLIC_URL || null,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'disha-chatbot',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10),
  },

  // Normalised (quotes and trailing "/" stripped, lower-case) because the
  // browser's Origin header never has either — "http://localhost:3000/"
  // in .env would otherwise never match.
  corsAllowedOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS, ['http://localhost:5173', 'http://localhost:5174'])
    .map((o) => o.replace(/^["']|["']$/g, '').replace(/\/+$/, '').toLowerCase()),

  // Module architecture (blueprint § Module architecture) — the single switchboard
  // every future project reconfigures instead of editing business logic.
  enabledModules: new Set(parseList(process.env.ENABLED_MODULES, ['verification', 'inventory'])),

  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || '',
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    senderId: process.env.WHATSAPP_SENDER_ID || '',
  },

  inventory: {
    apiUrl: process.env.INVENTORY_API_URL || '',
    apiKey: process.env.INVENTORY_API_KEY || '',
    resultsBaseUrl: process.env.INVENTORY_RESULTS_BASE_URL || 'https://disha-estate-management.vercel.app/property',
  },

  // License protection (blueprint §40 update) — license.txt is AES-256-GCM
  // authenticated-encrypted, so any direct edit to the file breaks GCM's auth
  // tag and is detected as tampering on the very next read; no separate
  // signature scheme is needed. LICENSE_ENCRYPTION_KEY is hashed into a
  // 32-byte key regardless of the raw string's length, so any passphrase works.
  license: {
    encryptionKey: process.env.LICENSE_ENCRYPTION_KEY || 'dev-only-license-key-change-me',
    filePath: process.env.LICENSE_FILE_PATH || path.join(__dirname, '..', '..', 'storage', 'license.txt'),
  },
};

module.exports = env;
