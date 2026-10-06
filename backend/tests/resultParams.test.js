const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildResultParams } = require('../src/modules/inventory/MockInventoryProvider');

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
  const p = buildResultParams({ location: ['Bopal', 'SG Highway', 'Bopal'] });
  assert.equal(p.get('localities'), 'bopal,sg highway');
});
