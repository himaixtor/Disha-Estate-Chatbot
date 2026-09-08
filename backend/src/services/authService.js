const usersRepo = require('../db/repositories/usersRepo');
const rolesRepo = require('../db/repositories/rolesRepo');
const refreshTokensRepo = require('../db/repositories/refreshTokensRepo');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken, generateRefreshToken, hashRefreshToken } = require('../utils/tokens');
const { uuid } = require('../utils/uuid');
const { ApiError } = require('../utils/apiResponse');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function login(email, password) {
  const user = await usersRepo.findByEmail(email);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new ApiError(423, 'ACCOUNT_LOCKED', 'This account is temporarily locked due to failed sign-in attempts.');
  }

  const isMatch = await verifyPassword(password, user.password_hash);
  if (!isMatch) {
    const attempts = user.failed_login_attempts + 1;
    const lockUntil = attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
      : null;
    await usersRepo.recordFailedLogin(user.uid, { lockUntil });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  await usersRepo.resetFailedLogins(user.uid);

  const role = await rolesRepo.findByUid(user.role_uid);
  const permissions = rolesRepo.toPermissions(role);

  const accessToken = signAccessToken({ uid: user.uid, role_uid: user.role_uid, permissions });
  const { raw, hash, expiresAt } = generateRefreshToken();
  await refreshTokensRepo.create({ uid: uuid(), userUid: user.uid, tokenHash: hash, expiresAt });

  return {
    accessToken,
    refreshToken: raw,
    user: { uid: user.uid, email: user.email, name: user.name, role: role?.role_name, permissions },
  };
}

async function refresh(rawToken) {
  const hash = hashRefreshToken(rawToken);
  const record = await refreshTokensRepo.findValidByHash(hash);
  if (!record) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Please sign in again.');

  const user = await usersRepo.findByUid(record.user_uid);
  if (!user || !user.is_active) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Please sign in again.');

  // rotation: revoke the used token, issue a new one
  await refreshTokensRepo.revoke(record.uid);
  const role = await rolesRepo.findByUid(user.role_uid);
  const permissions = rolesRepo.toPermissions(role);
  const accessToken = signAccessToken({ uid: user.uid, role_uid: user.role_uid, permissions });
  const { raw, hash: newHash, expiresAt } = generateRefreshToken();
  await refreshTokensRepo.create({ uid: uuid(), userUid: user.uid, tokenHash: newHash, expiresAt });

  return { accessToken, refreshToken: raw };
}

async function logout(rawToken) {
  const hash = hashRefreshToken(rawToken);
  const record = await refreshTokensRepo.findValidByHash(hash);
  if (record) await refreshTokensRepo.revoke(record.uid);
}

async function createUser({ email, password, name, roleUid, contactNumber }) {
  const existing = await usersRepo.findByEmail(email);
  if (existing) throw new ApiError(409, 'EMAIL_IN_USE', 'A user with this email already exists.');
  const passwordHash = await hashPassword(password);
  const uid = uuid();
  await usersRepo.create({ uid, email, name, passwordHash, roleUid, contactNumber });
  return uid;
}

module.exports = { login, refresh, logout, createUser };
