const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chatLocation } = require('../src/validators/schemas');

test('accepts a typed locality with no selected service sectors', () => {
  const result = chatLocation.safeParse({ serviceSectorIds: [], locationText: 'ranip' });
  assert.equal(result.success, true);
});

test('requires a selected sector or typed locality', () => {
  const result = chatLocation.safeParse({ serviceSectorIds: [] });
  assert.equal(result.success, false);
});