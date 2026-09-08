const { pool } = require('../config/db');
const authService = require('../services/authService');
const usersRepo = require('../db/repositories/usersRepo');
const rolesRepo = require('../db/repositories/rolesRepo');
const { ok } = require('../utils/apiResponse');
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

const createUser = asyncHandler(async (req, res) => {
  const uid = await authService.createUser(req.body);
  ok(res, { uid }, 'User created.', 201);
});

const setUserActive = asyncHandler(async (req, res) => {
  await usersRepo.setActive(req.params.uid, req.body.isActive);
  ok(res, {}, 'User updated.');
});

module.exports = { dashboard, listUsers, listRoles, createUser, setUserActive };
