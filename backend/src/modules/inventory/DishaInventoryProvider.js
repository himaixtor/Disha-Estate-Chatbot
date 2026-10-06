const InventoryProvider = require('./InventoryProvider');
const env = require('../../config/env');
const { ApiError } = require('../../utils/apiResponse');

const SKIP_PROPERTY_TYPES = ['other'];
const SKIP_BHK = ['general inquiry', 'general enquiry', 'general inquery'];
const MAX_CHAT_PROPERTIES = 5;

function uniqueValues(value) {
  return [...new Set((Array.isArray(value) ? value : [value])
    .map((item) => String(item || '').trim())
    .filter(Boolean))];
}

function buildResultParams({ category, subCategory, location }) {
  const propertyTypes = uniqueValues(category)
    .map((value) => value.toLowerCase())
    .filter((value) => !SKIP_PROPERTY_TYPES.includes(value));
  const bhks = uniqueValues(subCategory)
    .filter((value) => !SKIP_BHK.includes(value.toLowerCase()))
    .map((value) => (/^\d+\s*BHK$/i.test(value) ? value.replace(/\s+/g, '') : value));
  const localities = uniqueValues(location).map((value) => value.toLowerCase());
  const params = new URLSearchParams();

  if (propertyTypes.length) params.set('property_type', propertyTypes.join(','));
  if (bhks.length) params.set('bhk', bhks.join(','));
  if (localities.length) params.set('localities', localities.join(','));
  return params;
}

function imageUrl(image) {
  if (typeof image === 'string') return image;
  return typeof image?.url === 'string' ? image.url : '';
}

function extractProperties(payload) {
  const items = Array.isArray(payload)
    ? payload
    : [payload?.data, payload?.properties, payload?.results, payload?.items].find(Array.isArray) || [];
  return items.map((item) => ({
    id: item.id ?? item.slug ?? item.crm_property_id ?? null,
    slug: item.slug || '',
    name: item.property_name || item.title || item.name || 'Property',
    image: imageUrl(item.featured_image || item.image),
    imageAlt: item.featured_image?.alt || item.property_name || item.title || 'Property image',
    price: item.price || '',
    propertyType: item.property_type || '',
    configuration: item.configuration || '',
    location: item.location || '',
  }));
}

function propertyDetailUrl(slug) {
  if (!slug) return '';
  const baseUrl = `${env.inventory.propertyDetailBaseUrl.replace(/\/+$/, '')}/`;
  return new URL(encodeURIComponent(slug), baseUrl).toString();
}

class DishaInventoryProvider extends InventoryProvider {
  async findMatches(criteria) {
    const params = buildResultParams(criteria);
    const query = params.toString();
    const resultUrl = query ? `${env.inventory.resultsBaseUrl}?${query}` : env.inventory.resultsBaseUrl;
    const apiKey = env.inventory.apiKey;
    if (!apiKey) throw new ApiError(503, 'INVENTORY_NOT_CONFIGURED', 'Property search API key is not configured.');

    let response;
    try {
      response = await fetch(`${env.inventory.apiUrl}?${query}`, {
        headers: { Accept: 'application/json', 'X-Disha-Estate-API-Key': apiKey },
        signal: AbortSignal.timeout(15000),
      });
    } catch (_err) {
      throw new ApiError(502, 'INVENTORY_UNAVAILABLE', 'Could not connect to the property search API.');
    }
    if (!response.ok) {
      throw new ApiError(502, 'INVENTORY_REQUEST_FAILED', `The property search API returned HTTP ${response.status}.`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (_err) {
      throw new ApiError(502, 'INVALID_INVENTORY_RESPONSE', 'The property search API returned invalid JSON.');
    }

    const allProperties = extractProperties(payload);
    const properties = allProperties.slice(0, MAX_CHAT_PROPERTIES).map((property) => ({
      ...property,
      detailUrl: propertyDetailUrl(property.slug),
    }));
    return { matched: properties.length > 0, resultUrl, properties };
  }
}

module.exports = DishaInventoryProvider;
module.exports.buildResultParams = buildResultParams;
module.exports.extractProperties = extractProperties;
module.exports.propertyDetailUrl = propertyDetailUrl;