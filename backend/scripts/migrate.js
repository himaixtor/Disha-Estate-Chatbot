// Applies database/01_schema.sql against the configured MySQL database.
// Usage: npm run migrate   (run from backend/, after setting up backend/.env)
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', '01_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'disha-chatbot',
    multipleStatements: true,
  });

  console.log(`Applying schema to ${process.env.DB_NAME || 'disha-chatbot'}@${process.env.DB_HOST || 'localhost'} ...`);
  await conn.query(sql);
  console.log('Schema applied successfully — 16 tables created (or already present).');
  await conn.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
