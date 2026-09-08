const { pool } = require('../../config/db');

async function findByUid(uid) {
  const [rows] = await pool.query('SELECT * FROM roles WHERE uid = :uid', { uid });
  return rows[0] || null;
}

async function findByName(roleName) {
  const [rows] = await pool.query('SELECT * FROM roles WHERE role_name = :roleName', { roleName });
  return rows[0] || null;
}

async function list() {
  const [rows] = await pool.query('SELECT * FROM roles ORDER BY role_name');
  return rows;
}

function toPermissions(role) {
  if (!role) return {};
  return {
    can_view_all_chats: !!role.can_view_all_chats,
    can_download: !!role.can_download,
    can_manage_users: !!role.can_manage_users,
    can_access_dashboard: !!role.can_access_dashboard,
    can_access_train_ai: !!role.can_access_train_ai,
    can_access_token_usage: !!role.can_access_token_usage,
    can_access_scheduler: !!role.can_access_scheduler,
    can_access_license_management: !!role.can_access_license_management,
    can_view_all_admin_chats: !!role.can_view_all_admin_chats,
  };
}

module.exports = { findByUid, findByName, list, toPermissions };
