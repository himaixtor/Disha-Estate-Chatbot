const { pool } = require('../../config/db');

async function add({ sessionId, responseType, messageText, isWelcome = false }) {
  await pool.query(
    `INSERT INTO chat_messages (session_id, response_type, message_text, is_welcome) VALUES (:sessionId, :responseType, :messageText, :isWelcome)`,
    { sessionId, responseType, messageText, isWelcome: isWelcome ? 1 : 0 }
  );
}

async function listForSession(sessionId) {
  const [rows] = await pool.query(
    'SELECT * FROM chat_messages WHERE session_id = :sessionId AND is_visible = 1 ORDER BY timestamp ASC',
    { sessionId }
  );
  return rows;
}

module.exports = { add, listForSession };
