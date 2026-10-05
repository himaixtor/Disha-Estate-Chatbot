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

test('rejects numbers that are not valid mobiles', () => {
  for (const v of ['5876543210', '0123456789', '98765432101', '987654321', '+449876543210', '+14155552671999', '+33612345678']) {
    assert.equal(isValidMobile(v), false, v);
  }
});

test('accepts the supported international regions', () => {
  const cases = {
    '+14155552671': '+14155552671',
    '+44 7911 123456': '+447911123456',
    '+4407911123456': '+447911123456',
    '+61 412 345 678': '+61412345678',
    '+971 50 123 4567': '+971501234567',
    '00971501234567': '+971501234567',
    '+974 3312 3456': '+97433123456',
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(normalizeMobile(input), expected, input);
});

test('rejects non-mobile numbers in the international regions', () => {
  for (const v of ['+14155', '+441234567890', '+61212345678', '+971412345678', '+97444123456']) {
    assert.equal(isValidMobile(v), false, v);
  }
});
