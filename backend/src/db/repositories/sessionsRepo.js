const { pool } = require('../../config/db');

async function create({ sessionId }) {
  await pool.query('INSERT INTO chatbot_sessions (session_id, state) VALUES (:sessionId, \'WELCOME\')', { sessionId });
}

async function findById(sessionId) {
  const [rows] = await pool.query('SELECT * FROM chatbot_sessions WHERE session_id = :sessionId', { sessionId });
  return rows[0] || null;
}

async function updateFields(sessionId, fields) {
  const colMap = {
    name: 'name', email: 'email', mobileNumber: 'mobile_number', chatLanguage: 'chat_language',
    categoryId: 'category_id', subcategoryId: 'subcategory_id', serviceSectorId: 'service_sector_id',
    state: 'state', leadGenerated: 'lead_generated', leadStatus: 'lead_status', isFocus: 'is_focus',
    reviewRating: 'review_rating', userUid: 'user_uid', conversationTitle: 'conversation_title',
    deletedByOwner: 'deleted_by_owner', isPinned: 'is_pinned',
  };
  const cols = [];
  const params = { sessionId };
  for (const [key, col] of Object.entries(colMap)) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = :${key}`);
      params[key] = fields[key];
    }
  }
  if (!cols.length) return;
  await pool.query(`UPDATE chatbot_sessions SET ${cols.join(', ')} WHERE session_id = :sessionId`, params);
}

async function list({
  limit = 25, offset = 0, leadStatus, categoryId, search, dateFrom, dateTo,
} = {}) {
  const clauses = ['deleted_by_owner = 0'];
  const params = { limit, offset };
  if (leadStatus) { clauses.push('lead_status = :leadStatus'); params.leadStatus = leadStatus; }
  if (categoryId) { clauses.push('category_id = :categoryId'); params.categoryId = categoryId; }
  if (search) {
    clauses.push('(name LIKE :search OR mobile_number LIKE :search)');
    params.search = `%${search}%`;
  }
  // dateFrom/dateTo are 'YYYY-MM-DD' strings from the admin UI's date pickers;
  // dateTo is inclusive of the whole day.
  if (dateFrom) { clauses.push('created_at >= :dateFrom'); params.dateFrom = `${dateFrom} 00:00:00`; }
  if (dateTo) { clauses.push('created_at <= :dateTo'); params.dateTo = `${dateTo} 23:59:59`; }
  const [rows] = await pool.query(
    `SELECT * FROM chatbot_sessions WHERE ${clauses.join(' AND ')}
     ORDER BY is_pinned DESC, created_at DESC LIMIT :limit OFFSET :offset`,
    params
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM chatbot_sessions WHERE ${clauses.join(' AND ')}`,
    params
  );
  return { rows, total };
}

module.exports = { create, findById, updateFields, list };
