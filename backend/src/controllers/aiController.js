const { registry } = require('../modules/registry');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

// Release 2 route (blueprint §C /ai). Always mounted so the widget's hook is
// real, but responds from the StubAIProvider until "ai" is in ENABLED_MODULES
// and a real AIProvider implementation is registered.
const ask = asyncHandler(async (req, res) => {
  if (!env.enabledModules.has('ai')) {
    return ok(res, { answer: (await registry.ai.ask({})).answer, moduleEnabled: false });
  }
  const result = await registry.ai.ask({ sessionId: req.body.sessionId, message: req.body.message });
  ok(res, { ...result, moduleEnabled: true });
});

module.exports = { ask };
