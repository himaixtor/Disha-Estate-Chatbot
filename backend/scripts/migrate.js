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
  ['categories', 'parent_id', 'ADD COLUMN parent_id INT NULL AFTER id'],
  ['categories', 'cms_slug', 'ADD COLUMN cms_slug VARCHAR(180) NULL AFTER name'],
  ['subcategories', 'cms_slug', 'ADD COLUMN cms_slug VARCHAR(180) NULL AFTER name'],
  ['service_sectors', 'cms_slug', 'ADD COLUMN cms_slug VARCHAR(180) NULL AFTER area_code'],
  ['chatbot_sessions', 'category_ids', 'ADD COLUMN category_ids JSON NULL AFTER subcategory_id'],
  ['chatbot_sessions', 'subcategory_ids', 'ADD COLUMN subcategory_ids JSON NULL AFTER category_ids'],
  ['chatbot_sessions', 'service_sector_ids', 'ADD COLUMN service_sector_ids JSON NULL AFTER service_sector_id'],
];

const INDEX_UPGRADES = [
  ['categories', 'uq_categories_parent_name', 'CREATE UNIQUE INDEX uq_categories_parent_name ON categories (parent_id, name)'],
  ['categories', 'uq_categories_parent_cms_slug', 'CREATE UNIQUE INDEX uq_categories_parent_cms_slug ON categories (parent_id, cms_slug)'],
  ['categories', 'idx_categories_parent', 'CREATE INDEX idx_categories_parent ON categories (parent_id)'],
  ['service_sectors', 'uq_service_sector_cms_slug', 'CREATE UNIQUE INDEX uq_service_sector_cms_slug ON service_sectors (cms_slug)'],
];

const LEGACY_CATEGORY_INDEXES = ['uq_categories_name', 'uq_categories_cms_slug'];

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function applyColumnUpgrades(conn) {
  for (const [table, column, clause] of COLUMN_UPGRADES) {
    if (!(await tableExists(conn, table))) continue;
    if (await columnExists(conn, table, column)) continue;
    console.log(`  + ${table}.${column}`);
    await conn.query(`ALTER TABLE ${table} ${clause}`);
  }
}

async function applyLegacyCategoryIndexDrops(conn) {
  for (const index of LEGACY_CATEGORY_INDEXES) {
    const [rows] = await conn.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND INDEX_NAME = ? LIMIT 1`,
      [index]
    );
    if (!rows.length) continue;
    console.log(`  - categories.${index}`);
    await conn.query(`ALTER TABLE categories DROP INDEX ${index}`);
  }
}

async function foreignKeyTarget(conn, table, constraint) {
  const [rows] = await conn.query(
    `SELECT REFERENCED_TABLE_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1`,
    [table, constraint]
  );
  return rows[0]?.REFERENCED_TABLE_NAME || null;
}

async function ensureForeignKey(conn, table, constraint, targetTable, definition) {
  const target = await foreignKeyTarget(conn, table, constraint);
  if (target === targetTable) return;
  if (target) await conn.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${constraint}`);
  await conn.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} ${definition}`);
}

function parseIdArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

async function migrateLegacySubcategories(conn) {
  if (!(await tableExists(conn, 'subcategories'))) return;

  const sessionFkTarget = await foreignKeyTarget(conn, 'chatbot_sessions', 'fk_chatsess_subcategory');
  if (sessionFkTarget === 'subcategories') {
    await conn.query('ALTER TABLE chatbot_sessions DROP FOREIGN KEY fk_chatsess_subcategory');
  }

  const [legacyRows] = await conn.query('SELECT * FROM subcategories ORDER BY id');
  const idMap = new Map();
  for (const legacy of legacyRows) {
    const [existing] = await conn.query(
      `SELECT id FROM categories
       WHERE parent_id = ? AND (name = ? OR (? IS NOT NULL AND cms_slug = ?))
       ORDER BY id LIMIT 1`,
      [legacy.category_id, legacy.name, legacy.cms_slug || null, legacy.cms_slug || null]
    );
    let categoryId;
    if (existing.length) {
      categoryId = Number(existing[0].id);
      await conn.query(
        `UPDATE categories SET name = ?, cms_slug = ?, is_active = ?, sort_order = ?
         WHERE id = ? AND parent_id = ?`,
        [legacy.name, legacy.cms_slug || null, legacy.is_active, legacy.sort_order, categoryId, legacy.category_id]
      );
    } else {
      const [result] = await conn.query(
        `INSERT INTO categories
         (parent_id, name, cms_slug, is_active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [legacy.category_id, legacy.name, legacy.cms_slug || null, legacy.is_active, legacy.sort_order, legacy.created_at, legacy.updated_at]
      );
      categoryId = Number(result.insertId);
    }
    idMap.set(Number(legacy.id), categoryId);
  }

  for (const [legacyId, categoryId] of idMap) {
    await conn.query('UPDATE chatbot_sessions SET subcategory_id = ? WHERE subcategory_id = ?', [categoryId, legacyId]);
  }

  if (await columnExists(conn, 'chatbot_sessions', 'subcategory_ids')) {
    const [sessions] = await conn.query('SELECT session_id, subcategory_ids FROM chatbot_sessions WHERE subcategory_ids IS NOT NULL');
    for (const session of sessions) {
      const mappedIds = [...new Set(parseIdArray(session.subcategory_ids).map((id) => idMap.get(Number(id)) || Number(id)))];
      await conn.query('UPDATE chatbot_sessions SET subcategory_ids = ? WHERE session_id = ?', [JSON.stringify(mappedIds), session.session_id]);
    }
  }

  await conn.query('DROP TABLE subcategories');
  console.log(`  ~ migrated ${legacyRows.length} legacy subcategories into categories`);
}

async function applyIndexUpgrades(conn) {
  for (const [table, index, statement] of INDEX_UPGRADES) {
    const [rows] = await conn.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [table, index]
    );
    if (rows.length) continue;
    console.log(`  + ${table}.${index}`);
    await conn.query(statement);
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
  console.log('Removing legacy category indexes ...');
  await applyLegacyCategoryIndexDrops(conn);
  console.log('Migrating subcategories into categories ...');
  await migrateLegacySubcategories(conn);
  console.log('Checking for index upgrades ...');
  await applyIndexUpgrades(conn);
  await ensureForeignKey(
    conn,
    'categories',
    'fk_categories_parent',
    'categories',
    'FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL'
  );
  await ensureForeignKey(
    conn,
    'chatbot_sessions',
    'fk_chatsess_subcategory',
    'categories',
    'FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL'
  );
  console.log('Column upgrades complete.');

  await conn.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
