const { pool } = require('../../config/db');

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email });
  return rows[0] || null;
}

async function findByUid(uid) {
  const [rows] = await pool.query('SELECT * FROM users WHERE uid = :uid', { uid });
  return rows[0] || null;
}

async function create({ uid, email, name, passwordHash, roleUid, contactNumber }) {
  await pool.query(
    `INSERT INTO users (uid, email, name, password_hash, role_uid, contact_number)
     VALUES (:uid, :email, :name, :passwordHash, :roleUid, :contactNumber)`,
    { uid, email, name, passwordHash, roleUid, contactNumber: contactNumber || null }
  );
}

async function list({ limit = 50, offset = 0, search = '' } = {}) {
  const where = search
    ? 'WHERE name LIKE :search OR email LIKE :search OR contact_number LIKE :search'
    : '';
  const params = { limit, offset };
  if (search) params.search = `%${search}%`;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM users ${where}`,
    search ? { search: params.search } : {}
  );
  const [rows] = await pool.query(
    `SELECT uid, email, name, role_uid, contact_number, is_active, failed_login_attempts,
            locked_until, created_at, updated_at
     FROM users ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
    params
  );
  return { items: rows, total };
}

async function recordFailedLogin(uid, { lockUntil } = {}) {
  await pool.query(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = :lockUntil
     WHERE uid = :uid`,
    { uid, lockUntil: lockUntil || null }
  );
}

async function resetFailedLogins(uid) {
  await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE uid = :uid', { uid });
}

async function setActive(uid, isActive) {
  await pool.query('UPDATE users SET is_active = :isActive WHERE uid = :uid', { uid, isActive: isActive ? 1 : 0 });
}

async function setRole(uid, roleUid) {
  await pool.query('UPDATE users SET role_uid = :roleUid WHERE uid = :uid', { uid, roleUid });
}

module.exports = { findByEmail, findByUid, create, list, recordFailedLogin, resetFailedLogins, setActive, setRole };
