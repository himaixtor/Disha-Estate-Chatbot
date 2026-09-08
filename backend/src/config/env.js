require('dotenv').config();

function parseList(value, fallback = []) {
  if (!value) return fallback;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5002', 10),

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

  corsAllowedOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS, ['http://localhost:5173', 'http://localhost:5174']),

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
    resultsBaseUrl: process.env.INVENTORY_RESULTS_BASE_URL || 'https://example.com/properties',
  },
};

module.exports = env;
