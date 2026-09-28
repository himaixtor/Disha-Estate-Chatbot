const InventoryProvider = require('./InventoryProvider');
const env = require('../../config/env');

// Selections that mean "no specific preference" — they are left out of the
// results link entirely instead of being sent as a filter.
const SKIP_PROPERTY_TYPES = ['other'];
const SKIP_BHK = ['general inquiry', 'general enquiry', 'general inquery'];

// Builds the query string for the results page:
//   property_type — lower-case          ("Residential" -> "residential")
//   bhk           — no spaces           ("2 BHK" -> "2BHK")
//   localities    — lower-case          ("SG Highway" -> "sg highway")
// Empty values and the "no preference" choices above are omitted.
function buildResultParams({ category, subCategory, location }) {
  const params = new URLSearchParams();
  const propertyType = String(category || '').trim().toLowerCase();
  const bhk = String(subCategory || '').replace(/\s+/g, '');
  const localities = String(location || '').trim().toLowerCase();

  if (propertyType && !SKIP_PROPERTY_TYPES.includes(propertyType)) params.set('property_type', propertyType);
  if (bhk && !SKIP_BHK.includes(String(subCategory).trim().toLowerCase())) params.set('bhk', bhk);
  if (localities) params.set('localities', localities);
  return params;
}

/**
 * Stands in for Disha's real property inventory API (blueprint Issue G13 —
 * "will be provided later"). Deterministically "matches" every request so the
 * rest of the workflow can be built and tested now; swap this file for the
 * real client once that API is delivered — nothing else changes.
 */
class MockInventoryProvider extends InventoryProvider {
  async findMatches(criteria) {
    const query = buildResultParams(criteria).toString();
    return {
      matched: true,
      resultUrl: query ? `${env.inventory.resultsBaseUrl}?${query}` : env.inventory.resultsBaseUrl,
    };
  }
}

module.exports = MockInventoryProvider;
module.exports.buildResultParams = buildResultParams;
