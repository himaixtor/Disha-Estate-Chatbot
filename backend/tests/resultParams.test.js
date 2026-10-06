const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildResultParams, extractProperties, propertyDetailUrl } = require('../src/modules/inventory/DishaInventoryProvider');

test('bhk has no spaces, property_type and localities are lower-case', () => {
  const p = buildResultParams({ category: 'Residential', subCategory: '2 BHK', location: 'SG Highway' });
  assert.equal(p.get('property_type'), 'residential');
  assert.equal(p.get('bhk'), '2BHK');
  assert.equal(p.get('localities'), 'sg highway');
});

test('Other / General Inquiry are left out of the link', () => {
  const p = buildResultParams({ category: 'Other', subCategory: 'General Inquiry', location: 'Satellite' });
  assert.equal(p.has('property_type'), false);
  assert.equal(p.has('bhk'), false);
  assert.equal(p.toString(), 'localities=satellite');
});

test('multiple property types and options are included as comma-separated filters', () => {
  const p = buildResultParams({
    category: ['Residential', 'Commercial'],
    subCategory: ['2 BHK', '3 BHK', '2 BHK'],
    location: 'SG Highway',
  });
  assert.equal(p.get('property_type'), 'residential,commercial');
  assert.equal(p.get('bhk'), '2BHK,3BHK');
  assert.equal(p.get('localities'), 'sg highway');
});

test('multiple no-preference choices are omitted without dropping other selections', () => {
  const p = buildResultParams({
    category: ['Other', 'Residential'],
    subCategory: ['General Inquiry', '3 BHK'],
    location: 'Satellite',
  });
  assert.equal(p.get('property_type'), 'residential');
  assert.equal(p.get('bhk'), '3BHK');
});

test('multiple localities are included as one comma-separated filter', () => {
  const p = buildResultParams({ location: ['south-bopal', 'sg-highway', 'south-bopal'] });
  assert.equal(p.get('localities'), 'south-bopal,sg-highway');
});

test('preserves CMS filter labels such as Flat and property slugs', () => {
  const params = buildResultParams({ category: ['residential'], subCategory: ['Flat'], location: ['gujarat-ahmedabad-shela'] });
  assert.equal(params.toString(), 'property_type=residential&bhk=Flat&localities=gujarat-ahmedabad-shela');
});

test('extracts display-safe property fields and featured image URLs', () => {
  const properties = extractProperties({ data: [{
    id: 42,
    title: 'Property title',
    property_name: 'Sarathya West',
    featured_image: { url: 'https://cms.example/image.webp', alt: 'Exterior' },
    price: '83.50 Lac',
    location: 'Shela',
    contact_details: { phone: 'not exposed' },
  }] });
  assert.deepEqual(properties[0], {
    id: 42,
    slug: '',
    name: 'Sarathya West',
    image: 'https://cms.example/image.webp',
    imageAlt: 'Exterior',
    price: '83.50 Lac',
    propertyType: '',
    configuration: '',
    location: 'Shela',
  });
});

test('builds the property detail link from the API slug', () => {
  assert.equal(propertyDetailUrl('sarathya-west-4'), 'https://uat.dishaestate.com/property/sarathya-west-4');
});
