const { test } = require('node:test');
const assert = require('node:assert/strict');
const rolesService = require('../src/services/rolesService');

test('super_admin can manage every role level', () => {
  assert.deepEqual(rolesService.assignableLevels('super_admin'), ['super_admin', 'admin', 'manager', 'viewer', 'other']);
  assert.equal(rolesService.canManageLevel('super_admin', 'admin'), true);
});

test('admin can only manage manager/viewer/other — never admin or super_admin', () => {
  assert.deepEqual(rolesService.assignableLevels('admin'), ['manager', 'viewer', 'other']);
  assert.equal(rolesService.canManageLevel('admin', 'manager'), true);
  assert.equal(rolesService.canManageLevel('admin', 'viewer'), true);
  assert.equal(rolesService.canManageLevel('admin', 'other'), true);
  assert.equal(rolesService.canManageLevel('admin', 'admin'), false);
  assert.equal(rolesService.canManageLevel('admin', 'super_admin'), false);
});

test('manager/viewer/other have no role-management scope', () => {
  assert.deepEqual(rolesService.assignableLevels('manager'), []);
  assert.deepEqual(rolesService.assignableLevels('viewer'), []);
  assert.deepEqual(rolesService.assignableLevels('other'), []);
});

test('assertCanManageLevel throws ApiError(403) outside scope', () => {
  assert.throws(() => rolesService.assertCanManageLevel('admin', 'super_admin'), (err) => err.status === 403 && err.code === 'ROLE_SCOPE_FORBIDDEN');
});

test('assertCanManageLevel does not throw inside scope', () => {
  assert.doesNotThrow(() => rolesService.assertCanManageLevel('admin', 'viewer'));
});
