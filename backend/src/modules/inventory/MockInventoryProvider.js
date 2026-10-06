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
  const propertyTypes = (Array.isArray(category) ? category : [category])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value, index, values) => value && !SKIP_PROPERTY_TYPES.includes(value) && values.indexOf(value) === index);
  const bhks = (Array.isArray(subCategory) ? subCategory : [subCategory])
    .map((value) => String(value || '').trim())
    .filter((value) => value && !SKIP_BHK.includes(value.toLowerCase()))
    .map((value, index, values) => ({ value: value.replace(/\s+/g, ''), key: value.toLowerCase() }))
    .filter((value, index, values) => values.findIndex((item) => item.key === value.key) === index)
    .map((value) => value.value);
  const localities = (Array.isArray(location) ? location : [location])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value, index, values) => value && values.indexOf(value) === index);

  if (propertyTypes.length) params.set('property_type', propertyTypes.join(','));
  if (bhks.length) params.set('bhk', bhks.join(','));
  if (localities.length) params.set('localities', localities.join(','));
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
