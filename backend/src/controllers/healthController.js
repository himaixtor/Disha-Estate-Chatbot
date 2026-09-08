const { pingDb } = require('../config/db');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { registry } = require('../modules/registry');

const health = asyncHandler(async (req, res) => {
  const dbUp = await pingDb();
  ok(res, {
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'connected' : 'unreachable',
    enabledModules: Array.from(registry.enabledModules),
  });
});

module.exports = { health };
