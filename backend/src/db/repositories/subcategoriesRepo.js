const { pool } = require('../../config/db');

function activeLeafOptions(rows, rootCategoryId) {
  const childrenByParent = new Map();
  rows.forEach((row) => {
    const parentId = Number(row.parent_id);
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(row);
  });

  const leaves = [];
  function visit(parentId, path, ancestors) {
    for (const child of childrenByParent.get(Number(parentId)) || []) {
      const childId = Number(child.id);
      if (ancestors.has(childId)) continue;
      const nextPath = [...path, child.name];
      const descendants = childrenByParent.get(childId) || [];
      if (descendants.length) {
        visit(childId, nextPath, new Set([...ancestors, childId]));
      } else {
        leaves.push({ ...child, root_category_id: Number(rootCategoryId), path: nextPath.join(' / ') });
      }
    }
  }
  visit(rootCategoryId, [], new Set([Number(rootCategoryId)]));
  return leaves;
}

async function listActiveByCategory(categoryId) {
  const [rows] = await pool.query(
    'SELECT id, parent_id, name, cms_slug, sort_order FROM categories WHERE parent_id = :categoryId AND is_active = 1 ORDER BY sort_order, name',
    { categoryId }
  );
  return rows;
}

async function listActiveLeafOptionsByCategory(categoryId) {
  const [rows] = await pool.query(
    'SELECT id, parent_id, name, cms_slug, sort_order FROM categories WHERE parent_id IS NOT NULL AND is_active = 1 ORDER BY sort_order, name'
  );
  return activeLeafOptions(rows, categoryId);
}

async function listAll() {
  const [rows] = await pool.query('SELECT * FROM categories WHERE parent_id IS NOT NULL ORDER BY parent_id, sort_order, name');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = :id AND parent_id IS NOT NULL', { id });
  return rows[0] || null;
}

async function create({ categoryId, name, sortOrder = 0 }) {
  const [result] = await pool.query(
    'INSERT INTO categories (parent_id, name, sort_order) VALUES (:categoryId, :name, :sortOrder)',
    { categoryId, name, sortOrder }
  );
  return result.insertId;
}

async function update(id, fields) {
  const cols = [];
  const params = { id };
  for (const [key, col] of [['name', 'name'], ['isActive', 'is_active'], ['sortOrder', 'sort_order'], ['categoryId', 'parent_id']]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!cols.length) return;
  await pool.query(`UPDATE categories SET ${cols.join(', ')} WHERE id = :id AND parent_id IS NOT NULL`, params);
}

module.exports = { listActiveByCategory, listActiveLeafOptionsByCategory, activeLeafOptions, listAll, findById, create, update };
