const { pool } = require('../config/db');
const env = require('../config/env');
const categoriesRepo = require('../db/repositories/categoriesRepo');
const { ApiError } = require('../utils/apiResponse');

function unwrapFilters(payload) {
  let current = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current?.locations) && Array.isArray(current?.property_types)) return current;
    current = current?.data || current?.filters || current?.result;
  }
  throw new ApiError(502, 'INVALID_CMS_FILTERS', 'The CMS filters response is missing locations or project types.');
}

function unwrapConfigurations(payload) {
  let current = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current?.configurations)) return current.configurations;
    current = current?.data || current?.filters || current?.result;
  }
  throw new ApiError(502, 'INVALID_CMS_FILTERS', 'The CMS filters response is missing configurations.');
}

function addRootCategoryIds(configurations, categories) {
  const categoryIdsByType = new Map();
  for (const category of categories) {
    for (const value of [category.cms_slug, category.name]) {
      const key = String(value || '').trim().toLowerCase();
      if (key && !categoryIdsByType.has(key)) categoryIdsByType.set(key, Number(category.id));
    }
  }
  return configurations.map((configuration) => {
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
      throw new ApiError(502, 'INVALID_CMS_FILTERS', 'The CMS configurations response contains an invalid item.');
    }
    const type = String(configuration.type || '').trim().toLowerCase();
    return { ...configuration, category_id: categoryIdsByType.get(type) || null };
  });
}

function namedItems(items) {
  return items
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .map((item) => ({ ...item, name: item.name.trim() }));
}

function cmsSlug(item) {
  const slug = String(item.slug || '').trim();
  if (!slug || slug.length > 180) {
    throw new ApiError(502, 'INVALID_CMS_FILTERS', 'A CMS taxonomy item is missing a valid slug.');
  }
  return slug;
}

function locationLeaves(items, parentSlugs = []) {
  const leaves = [];
  for (const item of namedItems(items)) {
    const slugs = [...parentSlugs, cmsSlug(item)];
    const children = Array.isArray(item.children) ? namedItems(item.children) : [];
    if (children.length) leaves.push(...locationLeaves(children, slugs));
    else leaves.push({ ...item, cmsSlug: slugs.join('/') });
  }
  return leaves;
}

function categoryTree(items) {
  return namedItems(items).map((item) => ({
    ...item,
    cmsSlug: cmsSlug(item),
    children: categoryTree(Array.isArray(item.children) ? item.children : []),
  }));
}

async function upsertCategory(conn, item, sortOrder) {
  let [rows] = await conn.query('SELECT id FROM categories WHERE parent_id IS NULL AND cms_slug = ? LIMIT 1', [item.cmsSlug]);
  if (!rows.length) [rows] = await conn.query('SELECT id FROM categories WHERE parent_id IS NULL AND name = ? LIMIT 1', [item.name]);
  if (rows.length) {
    await conn.query(
      'UPDATE categories SET name = ?, cms_slug = ?, is_active = 1, sort_order = ? WHERE id = ?',
      [item.name, item.cmsSlug, sortOrder, rows[0].id]
    );
    return Number(rows[0].id);
  }
  const [result] = await conn.query(
    'INSERT INTO categories (name, cms_slug, is_active, sort_order) VALUES (?, ?, 1, ?)',
    [item.name, item.cmsSlug, sortOrder]
  );
  return Number(result.insertId);
}

async function upsertChildCategory(conn, parentId, item, sortOrder) {
  let [rows] = await conn.query(
    'SELECT id FROM categories WHERE parent_id = ? AND cms_slug = ? LIMIT 1',
    [parentId, item.cmsSlug]
  );
  if (!rows.length) {
    [rows] = await conn.query(
      'SELECT id FROM categories WHERE parent_id = ? AND name = ? LIMIT 1',
      [parentId, item.name]
    );
  }
  if (rows.length) {
    await conn.query(
      'UPDATE categories SET name = ?, cms_slug = ?, is_active = 1, sort_order = ? WHERE id = ? AND parent_id = ?',
      [item.name, item.cmsSlug, sortOrder, rows[0].id, parentId]
    );
    return Number(rows[0].id);
  }
  const [result] = await conn.query(
    'INSERT INTO categories (parent_id, name, cms_slug, is_active, sort_order) VALUES (?, ?, ?, 1, ?)',
    [parentId, item.name, item.cmsSlug, sortOrder]
  );
  return Number(result.insertId);
}

async function syncChildCategories(conn, parentId, children) {
  let synced = 0;
  for (const [index, child] of children.entries()) {
    const childId = await upsertChildCategory(conn, parentId, child, index + 1);
    synced += 1;
    synced += await syncChildCategories(conn, childId, child.children);
  }
  return synced;
}

async function upsertLocation(conn, item) {
  let [rows] = await conn.query('SELECT id FROM service_sectors WHERE cms_slug = ? LIMIT 1', [item.cmsSlug]);
  if (!rows.length) {
    [rows] = await conn.query(
      'SELECT id FROM service_sectors WHERE LOWER(TRIM(sector_name)) = LOWER(?) ORDER BY id LIMIT 1',
      [item.name]
    );
  }
  const slug = String(item.slug || '').trim();
  if (rows.length) {
    await conn.query(
      'UPDATE service_sectors SET sector_name = ?, slug = ?, cms_slug = ?, is_active = 1 WHERE id = ?',
      [item.name, slug, item.cmsSlug, rows[0].id]
    );
    return;
  }
  await conn.query(
    'INSERT INTO service_sectors (sector_name, slug, cms_slug, is_active) VALUES (?, ?, ?, 1)',
    [item.name, slug, item.cmsSlug]
  );
}

async function fetchCmsFiltersPayload() {
  if (!env.cmsFilters.apiKey) {
    throw new ApiError(503, 'CMS_SYNC_NOT_CONFIGURED', 'Set CMS_FILTERS_API_KEY in the backend environment before syncing.');
  }

  let response;
  try {
    response = await fetch(env.cmsFilters.apiUrl, {
      headers: { Accept: 'application/json', 'X-Disha-Estate-API-Key': env.cmsFilters.apiKey },
      signal: AbortSignal.timeout(15000),
    });
  } catch (_err) {
    throw new ApiError(502, 'CMS_UNAVAILABLE', 'Could not connect to the CMS filters API.');
  }
  if (!response.ok) {
    throw new ApiError(502, 'CMS_REQUEST_FAILED', `The CMS filters API returned HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch (_err) {
    throw new ApiError(502, 'INVALID_CMS_FILTERS', 'The CMS filters API returned invalid JSON.');
  }
}

async function getCmsPropertyConfigurations() {
  const payload = await fetchCmsFiltersPayload();
  return addRootCategoryIds(unwrapConfigurations(payload), await categoriesRepo.listAll());
}

async function syncCmsFilters() {
  const filters = unwrapFilters(await fetchCmsFiltersPayload());

  const projectTypes = categoryTree(filters.property_types);
  const locations = locationLeaves(filters.locations);
  if (!projectTypes.length || !locations.length) {
    throw new ApiError(502, 'EMPTY_CMS_FILTERS', 'The CMS response contains no property types or selectable locations.');
  }

  const conn = await pool.getConnection();
  let subcategoriesSynced = 0;
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE categories SET is_active = 0 WHERE cms_slug IS NOT NULL');
    await conn.query('UPDATE service_sectors SET is_active = 0 WHERE cms_slug IS NOT NULL');
    for (const [categoryIndex, projectType] of projectTypes.entries()) {
      const categoryId = await upsertCategory(conn, projectType, categoryIndex + 1);
      subcategoriesSynced += await syncChildCategories(conn, categoryId, projectType.children);
    }
    for (const location of locations) await upsertLocation(conn, location);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return {
    categoriesSynced: projectTypes.length,
    subcategoriesSynced,
    locationsSynced: locations.length,
  };
}

module.exports = {
  syncCmsFilters,
  getCmsPropertyConfigurations,
  unwrapFilters,
  unwrapConfigurations,
  addRootCategoryIds,
  locationLeaves,
  categoryTree,
  syncChildCategories,
};