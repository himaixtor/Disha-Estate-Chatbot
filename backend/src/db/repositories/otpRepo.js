const { pool } = require('../../config/db');

async function create({ sessionId, mobileNumber, otpHash, expiresAt, maxAttempts }) {
  const [result] = await pool.query(
    `INSERT INTO otp_verifications (session_id, mobile_number, otp_hash, expires_at, max_attempts)
     VALUES (:sessionId, :mobileNumber, :otpHash, :expiresAt, :maxAttempts)`,
    { sessionId, mobileNumber, otpHash, expiresAt, maxAttempts }
  );
  return result.insertId;
}

async function findLatestForSession(sessionId) {
  const [rows] = await pool.query(
    'SELECT * FROM otp_verifications WHERE session_id = :sessionId ORDER BY created_at DESC LIMIT 1',
    { sessionId }
  );
  return rows[0] || null;
}

async function incrementAttempt(id) {
  await pool.query('UPDATE otp_verifications SET attempt_count = attempt_count + 1 WHERE id = :id', { id });
}

async function markVerified(id) {
  await pool.query('UPDATE otp_verifications SET verified_at = NOW() WHERE id = :id', { id });
}

// Seconds since the latest code for this session was issued, and how many
// codes the session has been sent in total — computed in SQL so the DB clock
// is used for both sides of the comparison (no app/DB timezone drift).
async function sendStats(sessionId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS sent_count,
            TIMESTAMPDIFF(SECOND, MAX(created_at), NOW()) AS seconds_since_last
       FROM otp_verifications WHERE session_id = :sessionId`,
    { sessionId }
  );
  return {
    sentCount: Number(rows[0]?.sent_count || 0),
    secondsSinceLast: rows[0]?.seconds_since_last == null ? null : Number(rows[0].seconds_since_last),
  };
}

module.exports = { create, findLatestForSession, incrementAttempt, markVerified, sendStats };
