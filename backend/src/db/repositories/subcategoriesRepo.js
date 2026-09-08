const { pool } = require('../../config/db');

async function listActiveByCategory(categoryId) {
  const [rows] = await pool.query(
    'SELECT id, category_id, name, sort_order FROM subcategories WHERE category_id = :categoryId AND is_active = 1 ORDER BY sort_order, name',
    { categoryId }
  );
  return rows;
}

async function listAll() {
  const [rows] = await pool.query('SELECT * FROM subcategories ORDER BY category_id, sort_order, name');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM subcategories WHERE id = :id', { id });
  return rows[0] || null;
}

async function create({ categoryId, name, sortOrder = 0 }) {
  const [result] = await pool.query(
    'INSERT INTO subcategories (category_id, name, sort_order) VALUES (:categoryId, :name, :sortOrder)',
    { categoryId, name, sortOrder }
  );
  return result.insertId;
}

async function update(id, fields) {
  const cols = [];
  const params = { id };
  for (const [key, col] of [['name', 'name'], ['isActive', 'is_active'], ['sortOrder', 'sort_order'], ['categoryId', 'category_id']]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!cols.length) return;
  await pool.query(`UPDATE subcategories SET ${cols.join(', ')} WHERE id = :id`, params);
}

module.exports = { listActiveByCategory, listAll, findById, create, update };
