const { pool } = require('../../config/db');

async function listActive() {
  const [rows] = await pool.query('SELECT id, name, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order, name');
  return rows;
}

async function listAll() {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = :id', { id });
  return rows[0] || null;
}

async function create({ name, sortOrder = 0 }) {
  const [result] = await pool.query('INSERT INTO categories (name, sort_order) VALUES (:name, :sortOrder)', { name, sortOrder });
  return result.insertId;
}

async function update(id, fields) {
  const cols = [];
  const params = { id };
  for (const [key, col] of [['name', 'name'], ['isActive', 'is_active'], ['sortOrder', 'sort_order']]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!cols.length) return;
  await pool.query(`UPDATE categories SET ${cols.join(', ')} WHERE id = :id`, params);
}

module.exports = { listActive, listAll, findById, create, update };
