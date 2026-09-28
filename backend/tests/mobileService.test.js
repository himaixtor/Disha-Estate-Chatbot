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

test('accepts common Indian formats', () => {
  for (const v of ['+91 98765 43210', '91-9876543210', '09876543210', '6000000000', '7123456789', '8123456789']) {
    assert.ok(isValidMobile(v), v);
  }
  assert.equal(normalizeMobile('91-9876543210'), '+919876543210');
});

test('rejects numbers that are not Indian mobiles', () => {
  for (const v of ['5876543210', '0123456789', '98765432101', '987654321', '+14155552671', '+449876543210']) {
    assert.equal(isValidMobile(v), false, v);
  }
});
