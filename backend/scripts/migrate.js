// Applies database/01_schema.sql against the configured MySQL database, then
// brings any already-existing tables up to date with columns added after the
// original CREATE TABLE (CREATE TABLE IF NOT EXISTS never alters an existing
// table, so those upgrades happen here instead, idempotently).
// Usage: npm run migrate   (run from backend/, after setting up backend/.env)
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// [table, column, "ADD COLUMN ..." clause] — each applied only if the column
// is missing, so re-running this script on an already-upgraded DB is a no-op.
const COLUMN_UPGRADES = [
  ['roles', 'can_manage_categories', "ADD COLUMN can_manage_categories TINYINT(1) NOT NULL DEFAULT 0 AFTER can_view_all_admin_chats"],
  ['roles', 'can_manage_roles', "ADD COLUMN can_manage_roles TINYINT(1) NOT NULL DEFAULT 0 AFTER can_manage_categories"],
  ['roles', 'role_level', "ADD COLUMN role_level ENUM('super_admin','admin','manager','viewer','other') NOT NULL DEFAULT 'other' AFTER can_manage_roles"],
  ['roles', 'is_system', "ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0 AFTER role_level"],
  ['licenses', 'license_file_path', "ADD COLUMN license_file_path VARCHAR(500) NULL AFTER tamper_detected_at"],
  ['licenses', 'license_file_hash', "ADD COLUMN license_file_hash CHAR(64) NULL AFTER license_file_path"],
];

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function applyColumnUpgrades(conn) {
  for (const [table, column, clause] of COLUMN_UPGRADES) {
    if (await columnExists(conn, table, column)) continue;
    console.log(`  + ${table}.${column}`);
    await conn.query(`ALTER TABLE ${table} ${clause}`);
  }
}

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
  console.log('Schema applied successfully — tables created (or already present).');

  console.log('Checking for column upgrades on existing tables ...');
  await applyColumnUpgrades(conn);
  console.log('Column upgrades complete.');

  await conn.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
