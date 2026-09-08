const { pool } = require('../../config/db');

async function create({ uid, userUid, tokenHash, expiresAt }) {
  await pool.query(
    `INSERT INTO refresh_tokens (uid, user_uid, token_hash, expires_at) VALUES (:uid, :userUid, :tokenHash, :expiresAt)`,
    { uid, userUid, tokenHash, expiresAt }
  );
}

async function findValidByHash(tokenHash) {
  const [rows] = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = :tokenHash AND revoked_at IS NULL AND expires_at > NOW()`,
    { tokenHash }
  );
  return rows[0] || null;
}

async function revoke(uid) {
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE uid = :uid', { uid });
}

async function revokeAllForUser(userUid) {
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_uid = :userUid AND revoked_at IS NULL', { userUid });
}

module.exports = { create, findValidByHash, revoke, revokeAllForUser };
