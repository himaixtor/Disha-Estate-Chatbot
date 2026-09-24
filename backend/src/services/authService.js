const usersRepo = require('../db/repositories/usersRepo');
const rolesRepo = require('../db/repositories/rolesRepo');
const refreshTokensRepo = require('../db/repositories/refreshTokensRepo');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken, generateRefreshToken, hashRefreshToken, signReauthToken, REAUTH_TTL_SECONDS } = require('../utils/tokens');
const { uuid } = require('../utils/uuid');
const { ApiError } = require('../utils/apiResponse');
const { buildSessionUser } = require('./sessionPayload');

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

  const accessToken = signAccessToken({ uid: user.uid, role_uid: user.role_uid, roleLevel: role?.role_level, permissions });
  const { raw, hash, expiresAt } = generateRefreshToken();
  await refreshTokensRepo.create({ uid: uuid(), userUid: user.uid, tokenHash: hash, expiresAt });

  return {
    accessToken,
    refreshToken: raw,
    user: await buildSessionUser(user, role),
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
  const accessToken = signAccessToken({ uid: user.uid, role_uid: user.role_uid, roleLevel: role?.role_level, permissions });
  const { raw, hash: newHash, expiresAt } = generateRefreshToken();
  await refreshTokensRepo.create({ uid: uuid(), userUid: user.uid, tokenHash: newHash, expiresAt });

  return { accessToken, refreshToken: raw };
}

async function logout(rawToken) {
  const hash = hashRefreshToken(rawToken);
  const record = await refreshTokensRepo.findValidByHash(hash);
  if (record) await refreshTokensRepo.revoke(record.uid);
}

// Step-up verification for sensitive pages: the already signed-in user
// re-enters their password and gets a short-lived, purpose-scoped token.
// Wrong passwords count toward the same lockout as normal sign-in.
const REAUTH_PURPOSES = ['license_management'];

async function reauthenticate(uid, password, purpose) {
  if (!REAUTH_PURPOSES.includes(purpose)) {
    throw new ApiError(400, 'INVALID_PURPOSE', 'Unknown verification purpose.');
  }
  const user = await usersRepo.findByUid(uid);
  if (!user || !user.is_active) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again.');

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
    // 400, not 401 — a 401 would make the Admin Portal treat it as an expired session and log out.
    throw new ApiError(400, 'INVALID_PASSWORD', 'Incorrect password. Please try again.');
  }

  await usersRepo.resetFailedLogins(user.uid);
  return { reauthToken: signReauthToken(user.uid, purpose), expiresIn: REAUTH_TTL_SECONDS };
}

async function createUser({ email, password, name, roleUid, contactNumber }) {
  const existing = await usersRepo.findByEmail(email);
  if (existing) throw new ApiError(409, 'EMAIL_IN_USE', 'A user with this email already exists.');
  const passwordHash = await hashPassword(password);
  const uid = uuid();
  await usersRepo.create({ uid, email, name, passwordHash, roleUid, contactNumber });
  return uid;
}

module.exports = { login, refresh, logout, reauthenticate, createUser };
