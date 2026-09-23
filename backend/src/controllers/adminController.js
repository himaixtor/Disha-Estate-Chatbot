const { pool } = require('../config/db');
const authService = require('../services/authService');
const rolesService = require('../services/rolesService');
const usersRepo = require('../db/repositories/usersRepo');
const rolesRepo = require('../db/repositories/rolesRepo');
const { ok, ApiError } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const [[totals]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM chatbot_sessions) AS total_conversations,
      (SELECT COUNT(*) FROM chatbot_sessions WHERE lead_generated = 1) AS total_leads,
      (SELECT COUNT(*) FROM chatbot_sessions WHERE created_at > NOW() - INTERVAL 1 DAY) AS conversations_today,
      (SELECT COUNT(*) FROM chatbot_sessions WHERE deleted_by_owner = 0 AND state NOT IN ('SHOW_RESULTS', 'NO_MATCH')) AS active_sessions
  `);
  const [byCategory] = await pool.query(`
    SELECT c.name, COUNT(*) AS count FROM chatbot_sessions s
    JOIN categories c ON c.id = s.category_id GROUP BY c.name ORDER BY count DESC
  `);
  const [bySector] = await pool.query(`
    SELECT ss.sector_name, COUNT(*) AS count FROM chatbot_sessions s
    JOIN service_sectors ss ON ss.id = s.service_sector_id GROUP BY ss.sector_name ORDER BY count DESC LIMIT 10
  `);
  ok(res, { totals, byCategory, bySector });
});

const listUsers = asyncHandler(async (req, res) => ok(res, await usersRepo.list()));

const listRoles = asyncHandler(async (req, res) => ok(res, await rolesRepo.list()));

// Role-management hierarchy (blueprint §30 update): a user may only assign a
// role whose role_level is within their own assignableLevels — this is what
// keeps "admin can only set roles for manager/viewer/other" true no matter
// which endpoint is used to change a user's role.
const createUser = asyncHandler(async (req, res) => {
  const targetRole = await rolesRepo.findByUid(req.body.roleUid);
  if (!targetRole) throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role not found.');
  rolesService.assertCanManageLevel(req.user.roleLevel, targetRole.role_level);

  const uid = await authService.createUser(req.body);
  ok(res, { uid }, 'User created.', 201);
});

const setUserActive = asyncHandler(async (req, res) => {
  const targetUser = await usersRepo.findByUid(req.params.uid);
  if (!targetUser) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  const targetRole = await rolesRepo.findByUid(targetUser.role_uid);
  if (targetRole) rolesService.assertCanManageLevel(req.user.roleLevel, targetRole.role_level);

  await usersRepo.setActive(req.params.uid, req.body.isActive);
  ok(res, {}, 'User updated.');
});

const setUserRole = asyncHandler(async (req, res) => {
  const targetUser = await usersRepo.findByUid(req.params.uid);
  if (!targetUser) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  const currentRole = await rolesRepo.findByUid(targetUser.role_uid);
  if (currentRole) rolesService.assertCanManageLevel(req.user.roleLevel, currentRole.role_level);

  const newRole = await rolesRepo.findByUid(req.body.roleUid);
  if (!newRole) throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role not found.');
  rolesService.assertCanManageLevel(req.user.roleLevel, newRole.role_level);

  await usersRepo.setRole(req.params.uid, req.body.roleUid);
  ok(res, {}, 'User role updated.');
});

const createRole = asyncHandler(async (req, res) => {
  const roleLevel = req.body.roleLevel || 'other';
  rolesService.assertCanManageLevel(req.user.roleLevel, roleLevel);

  const existing = await rolesRepo.findByName(req.body.roleName);
  if (existing) throw new ApiError(409, 'ROLE_NAME_IN_USE', 'A role with this name already exists.');

  const uid = await rolesRepo.create({ ...req.body, roleLevel });
  ok(res, { uid }, 'Role created.', 201);
});

const updateRole = asyncHandler(async (req, res) => {
  const role = await rolesRepo.findByUid(req.params.uid);
  if (!role) throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role not found.');

  rolesService.assertCanManageLevel(req.user.roleLevel, role.role_level);
  if (req.body.roleLevel && req.body.roleLevel !== role.role_level) {
    if (role.is_system) throw new ApiError(403, 'FORBIDDEN', 'A system role’s level cannot be changed.');
    rolesService.assertCanManageLevel(req.user.roleLevel, req.body.roleLevel);
  }
  if (role.is_system && req.user.roleLevel !== 'super_admin') {
    throw new ApiError(403, 'FORBIDDEN', 'System roles can only be modified by a super admin.');
  }

  await rolesRepo.update(req.params.uid, req.body);
  ok(res, {}, 'Role updated.');
});

const deleteRole = asyncHandler(async (req, res) => {
  const role = await rolesRepo.findByUid(req.params.uid);
  if (!role) throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role not found.');
  if (role.is_system) throw new ApiError(403, 'FORBIDDEN', 'System roles cannot be deleted.');
  rolesService.assertCanManageLevel(req.user.roleLevel, role.role_level);

  const inUse = await rolesRepo.countUsers(req.params.uid);
  if (inUse > 0) throw new ApiError(409, 'ROLE_IN_USE', `${inUse} user(s) still have this role assigned. Reassign them first.`);

  await rolesRepo.remove(req.params.uid);
  ok(res, {}, 'Role deleted.');
});

module.exports = {
  dashboard, listUsers, listRoles, createUser, setUserActive, setUserRole,
  createRole, updateRole, deleteRole,
};
