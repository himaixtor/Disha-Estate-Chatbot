const { pool } = require('../../config/db');

async function listActive() {
  const [rows] = await pool.query('SELECT id, sector_name, area_code FROM service_sectors WHERE is_active = 1 ORDER BY sector_name');
  return rows;
}

async function search(query) {
  const [rows] = await pool.query(
    `SELECT id, sector_name, area_code FROM service_sectors
     WHERE is_active = 1 AND (sector_name LIKE :q OR area_code LIKE :q) ORDER BY sector_name LIMIT 25`,
    { q: `%${query}%` }
  );
  return rows;
}

async function findByNameOrAreaCode(text) {
  const [rows] = await pool.query(
    `SELECT id, sector_name, area_code FROM service_sectors
     WHERE is_active = 1 AND (sector_name LIKE :q OR area_code = :exact) LIMIT 1`,
    { q: `%${text}%`, exact: text }
  );
  return rows[0] || null;
}

async function listAll() {
  const [rows] = await pool.query('SELECT * FROM service_sectors ORDER BY sector_name');
  return rows;
}

async function create({ sectorName, areaCode }) {
  const [result] = await pool.query(
    'INSERT INTO service_sectors (sector_name, area_code) VALUES (:sectorName, :areaCode)',
    { sectorName, areaCode }
  );
  return result.insertId;
}

async function update(id, fields) {
  const cols = [];
  const params = { id };
  for (const [key, col] of [['sectorName', 'sector_name'], ['areaCode', 'area_code'], ['isActive', 'is_active']]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!cols.length) return;
  await pool.query(`UPDATE service_sectors SET ${cols.join(', ')} WHERE id = :id`, params);
}

module.exports = { listActive, search, findByNameOrAreaCode, listAll, create, update };
