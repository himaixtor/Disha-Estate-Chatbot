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
