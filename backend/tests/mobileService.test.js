const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMobile, isValidMobile } = require('../src/services/mobileService');

test('normalizes a bare 10-digit Indian number', () => {
  assert.equal(normalizeMobile('9876543210'), '+919876543210');
});

test('accepts an already-E.164 number', () => {
  assert.equal(normalizeMobile('+919876543210'), '+919876543210');
});

test('rejects garbage input', () => {
  assert.equal(isValidMobile('not a number'), false);
});

test('rejects too-short input', () => {
  assert.equal(isValidMobile('12345'), false);
});
