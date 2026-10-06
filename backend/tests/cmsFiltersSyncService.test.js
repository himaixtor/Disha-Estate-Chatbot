const { test } = require('node:test');
const assert = require('node:assert/strict');
const { categoryTree, locationLeaves, syncChildCategories, unwrapFilters } = require('../src/services/cmsFiltersSyncService');
const { activeLeafOptions } = require('../src/db/repositories/subcategoriesRepo');

test('unwraps nested CMS filters responses', () => {
  const filters = { locations: [], property_types: [] };
  assert.equal(unwrapFilters({ data: { filters } }), filters);
});

test('returns terminal locations rather than parent group nodes', () => {
  const locations = locationLeaves([
    { name: 'Region', slug: 'region', children: [
      { name: 'Area', slug: 'area', children: [{ name: 'Neighborhood', slug: 'neighborhood', children: [] }] },
    ] },
  ]);
  assert.deepEqual(locations.map((item) => item.name), ['Neighborhood']);
  assert.equal(locations[0].cmsSlug, 'region/area/neighborhood');
});

test('rejects payloads without both taxonomy arrays', () => {
  assert.throws(() => unwrapFilters({ locations: [] }), { code: 'INVALID_CMS_FILTERS' });
});

test('retains category descendants at every level for database sync', () => {
  const [root] = categoryTree([
    { name: 'Residential', slug: 'residential', children: [
      { name: 'Bungalow', slug: 'residential-bungalow', children: [
        { name: 'Farm House', slug: 'residential-farm-house', children: [] },
      ] },
    ] },
  ]);
  assert.equal(root.children[0].name, 'Bungalow');
  assert.equal(root.children[0].children[0].name, 'Farm House');
  assert.equal(root.children[0].children[0].cmsSlug, 'residential-farm-house');
});

test('inserts nested categories under their immediate parent', async () => {
  let nextId = 10;
  const inserts = [];
  const conn = {
    async query(sql, params) {
      if (sql.startsWith('SELECT id FROM categories')) return [[]];
      if (sql.startsWith('INSERT INTO categories')) {
        inserts.push(params);
        nextId += 1;
        return [{ insertId: nextId }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const [root] = categoryTree([
    { name: 'Residential', slug: 'residential', children: [
      { name: 'Bungalow', slug: 'residential-bungalow', children: [
        { name: 'Farm House', slug: 'residential-farm-house', children: [] },
      ] },
    ] },
  ]);

  const synced = await syncChildCategories(conn, 1, root.children);

  assert.equal(synced, 2);
  assert.deepEqual(inserts.map(([parentId, name]) => [parentId, name]), [[1, 'Bungalow'], [11, 'Farm House']]);
});

test('chatbot choices include leaf descendants with a breadcrumb path', () => {
  const options = activeLeafOptions([
    { id: 2, parent_id: 1, name: 'Bungalow' },
    { id: 3, parent_id: 2, name: 'Farm House' },
    { id: 4, parent_id: 1, name: 'Apartment' },
  ], 1);
  assert.deepEqual(options.map((option) => option.path), ['Bungalow / Farm House', 'Apartment']);
  assert.deepEqual(options.map((option) => option.root_category_id), [1, 1]);
});