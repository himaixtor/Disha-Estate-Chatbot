const InventoryProvider = require('./InventoryProvider');
const env = require('../../config/env');

/**
 * Stands in for Disha's real property inventory API (blueprint Issue G13 —
 * "will be provided later"). Deterministically "matches" every request so the
 * rest of the workflow can be built and tested now; swap this file for the
 * real client once that API is delivered — nothing else changes.
 */
class MockInventoryProvider extends InventoryProvider {
  async findMatches({ category, subCategory, location }) {
    const params = new URLSearchParams({
      property_type: category || '',
      bhk: subCategory || '',
      localities: location || '',
    });
    return {
      matched: true,
      resultUrl: `${env.inventory.resultsBaseUrl}?${params.toString()}`,
    };
  }
}

module.exports = MockInventoryProvider;
