const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chatBudget } = require('../src/validators/schemas');

test('accepts positive budget amounts when maximum is at least the minimum', () => {
  assert.equal(chatBudget.safeParse({ minBudget: 100, maxBudget: 100 }).success, true);
  assert.equal(chatBudget.safeParse({ minBudget: 100.5, maxBudget: 200.75 }).success, true);
});

test('rejects non-positive budget amounts', () => {
  assert.equal(chatBudget.safeParse({ minBudget: 0, maxBudget: 100 }).success, false);
  assert.equal(chatBudget.safeParse({ minBudget: 1, maxBudget: -1 }).success, false);
});

test('rejects a maximum budget below the minimum', () => {
  assert.equal(chatBudget.safeParse({ minBudget: 101, maxBudget: 100 }).success, false);
});
