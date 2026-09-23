const { pool } = require('../../config/db');
const { uuid } = require('../../utils/uuid');

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

async function create(fields) {
  const id = uuid();
  await pool.query(
    `INSERT INTO roles
      (uid, role_name, can_view_all_chats, can_download, can_manage_users, can_access_dashboard,
       can_access_train_ai, can_access_token_usage, can_access_scheduler, can_access_license_management,
       can_view_all_admin_chats, can_manage_categories, can_manage_roles, role_level)
     VALUES
      (:uid, :roleName, :canViewAllChats, :canDownload, :canManageUsers, :canAccessDashboard,
       :canAccessTrainAi, :canAccessTokenUsage, :canAccessScheduler, :canAccessLicenseManagement,
       :canViewAllAdminChats, :canManageCategories, :canManageRoles, :roleLevel)`,
    {
      uid: id,
      roleName: fields.roleName,
      canViewAllChats: !!fields.canViewAllChats,
      canDownload: !!fields.canDownload,
      canManageUsers: !!fields.canManageUsers,
      canAccessDashboard: fields.canAccessDashboard !== undefined ? !!fields.canAccessDashboard : true,
      canAccessTrainAi: !!fields.canAccessTrainAi,
      canAccessTokenUsage: !!fields.canAccessTokenUsage,
      canAccessScheduler: !!fields.canAccessScheduler,
      canAccessLicenseManagement: !!fields.canAccessLicenseManagement,
      canViewAllAdminChats: !!fields.canViewAllAdminChats,
      canManageCategories: !!fields.canManageCategories,
      canManageRoles: !!fields.canManageRoles,
      roleLevel: fields.roleLevel || 'other',
    }
  );
  return id;
}

const UPDATABLE_COLUMNS = {
  roleName: 'role_name',
  canViewAllChats: 'can_view_all_chats',
  canDownload: 'can_download',
  canManageUsers: 'can_manage_users',
  canAccessDashboard: 'can_access_dashboard',
  canAccessTrainAi: 'can_access_train_ai',
  canAccessTokenUsage: 'can_access_token_usage',
  canAccessScheduler: 'can_access_scheduler',
  canAccessLicenseManagement: 'can_access_license_management',
  canViewAllAdminChats: 'can_view_all_admin_chats',
  canManageCategories: 'can_manage_categories',
  canManageRoles: 'can_manage_roles',
  roleLevel: 'role_level',
};

async function update(uid, fields) {
  const sets = [];
  const params = { uid };
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[key] === undefined) continue;
    sets.push(`${column} = :${key}`);
    params[key] = typeof fields[key] === 'boolean' ? (fields[key] ? 1 : 0) : fields[key];
  }
  if (sets.length === 0) return;
  await pool.query(`UPDATE roles SET ${sets.join(', ')} WHERE uid = :uid`, params);
}

async function remove(uid) {
  await pool.query('DELETE FROM roles WHERE uid = :uid', { uid });
}

async function countUsers(roleUid) {
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM users WHERE role_uid = :roleUid', { roleUid });
  return rows[0].c;
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
    can_manage_categories: !!role.can_manage_categories,
    can_manage_roles: !!role.can_manage_roles,
  };
}

module.exports = { findByUid, findByName, list, create, update, remove, countUsers, toPermissions };
