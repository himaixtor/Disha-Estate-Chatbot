const authService = require('../services/authService');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const usersRepo = require('../db/repositories/usersRepo');
const rolesRepo = require('../db/repositories/rolesRepo');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  ok(res, result, 'Signed in.');
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  ok(res, result, 'Token refreshed.');
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  ok(res, {}, 'Signed out.');
});

const me = asyncHandler(async (req, res) => {
  const user = await usersRepo.findByUid(req.user.uid);
  const role = await rolesRepo.findByUid(user.role_uid);
  ok(res, {
    uid: user.uid, email: user.email, name: user.name,
    role: role?.role_name, permissions: rolesRepo.toPermissions(role),
  });
});

module.exports = { login, refresh, logout, me };
