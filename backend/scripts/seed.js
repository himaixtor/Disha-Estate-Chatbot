// Applies database/02_seed.sql — safe to re-run (INSERT IGNORE / upsert).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const seedPath = path.join(__dirname, '..', '..', 'database', '02_seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf8');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'disha-chatbot',
    multipleStatements: true,
  });

  console.log('Seeding roles, category hierarchy, service sectors, app settings ...');
  await conn.query(sql);
  console.log('Seed complete. Next: npm run create-admin -- --email you@disha-estate.com --password "..."');
  await conn.end();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
