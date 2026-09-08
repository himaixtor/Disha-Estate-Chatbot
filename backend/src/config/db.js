const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  dateStrings: true,
  namedPlaceholders: true,
  connectTimeout: 5000, // fail fast instead of hanging when MySQL is unreachable
});

async function pingDb() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { pool, pingDb };
