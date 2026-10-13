const { pool } = require('../../config/db');

async function listActive() {
  const [rows] = await pool.query('SELECT id, sector_name, slug FROM service_sectors WHERE is_active = 1 ORDER BY sector_name');
  return rows;
}

async function search(query) {
  const [rows] = await pool.query(
    `SELECT id, sector_name, slug FROM service_sectors
     WHERE is_active = 1 AND (sector_name LIKE :q OR slug LIKE :q) ORDER BY sector_name LIMIT 25`,
    { q: `%${query}%` }
  );
  return rows;
}

async function findByNameOrSlug(text) {
  const [rows] = await pool.query(
    `SELECT id, sector_name, slug FROM service_sectors
     WHERE is_active = 1 AND (sector_name LIKE :q OR slug = :exact) LIMIT 1`,
    { q: `%${text}%`, exact: text }
  );
  return rows[0] || null;
}

async function listAll({ limit, offset, search = '' } = {}) {
  if (limit === undefined) {
    const [rows] = await pool.query('SELECT * FROM service_sectors ORDER BY sector_name, id');
    return rows;
  }

  const where = search ? 'WHERE sector_name LIKE :search OR slug LIKE :search' : '';
  const params = { limit, offset };
  if (search) params.search = `%${search}%`;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM service_sectors ${where}`,
    search ? { search: params.search } : {}
  );
  const [rows] = await pool.query(
    `SELECT * FROM service_sectors ${where} ORDER BY sector_name, id LIMIT :limit OFFSET :offset`,
    params
  );
  return { items: rows, total };
}

async function create({ sectorName, slug }) {
  const [result] = await pool.query(
    'INSERT INTO service_sectors (sector_name, slug) VALUES (:sectorName, :slug)',
    { sectorName, slug }
  );
  return result.insertId;
}

async function update(id, fields) {
  const cols = [];
  const params = { id };
  for (const [key, col] of [['sectorName', 'sector_name'], ['slug', 'slug'], ['isActive', 'is_active']]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!cols.length) return;
  await pool.query(`UPDATE service_sectors SET ${cols.join(', ')} WHERE id = :id`, params);
}

module.exports = { listActive, search, findByNameOrSlug, listAll, create, update };
