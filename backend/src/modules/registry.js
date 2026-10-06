const env = require('../config/env');

const ConsoleOtpChannel = require('./verification/ConsoleOtpChannel');
const WhatsAppOtpChannel = require('./verification/WhatsAppOtpChannel');

const DishaInventoryProvider = require('./inventory/DishaInventoryProvider');

const StubAIProvider = require('./ai/StubAIProvider');
// Real AIProvider implementation plugs in here in Release 2,
// e.g.: const AIMiddlewareClient = require('./ai/AIMiddlewareClient');

/**
 * The ONLY file in the codebase that reads ENABLED_MODULES and instantiates a
 * concrete module implementation. Every controller/service depends on the
 * interface, never on a specific class — see blueprint § Module architecture.
 *
 * Removing a module for a future, non-Disha project means: take it out of
 * ENABLED_MODULES (or leave it out entirely) and, optionally, delete the
 * corresponding implementation file. Nothing else in the app changes.
 */
function buildRegistry() {
  const modules = env.enabledModules;

  const verification = env.whatsapp.apiUrl && modules.has('verification')
    ? new WhatsAppOtpChannel()
    : new ConsoleOtpChannel();

  const inventory = modules.has('inventory')
    ? new DishaInventoryProvider()
    : null;

  const ai = modules.has('ai')
    ? new StubAIProvider() // swap for the real AI Middleware client in Release 2
    : new StubAIProvider();

  return { verification, inventory, ai, enabledModules: modules };
}

module.exports = { registry: buildRegistry() };
