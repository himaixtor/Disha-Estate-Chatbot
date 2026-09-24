const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.uid,
      role: user.role_uid,
      roleLevel: user.roleLevel || null,
      permissions: user.permissions || {},
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.jwt.accessSecret);
  // A step-up (re-auth) token is signed with the same secret but must never
  // be accepted as a normal access token.
  if (payload.purpose) throw new Error('Not an access token.');
  return payload;
}

// Short-lived "step-up" token issued after the user re-enters their password
// for a sensitive area (e.g. License Management). Scoped to one purpose and
// one user; it is only ever held in memory by the Admin Portal page that
// asked for it, so leaving the page means re-entering the password next time.
const REAUTH_TTL_SECONDS = 10 * 60;

function signReauthToken(uid, purpose) {
  return jwt.sign({ sub: uid, purpose }, env.jwt.accessSecret, { expiresIn: REAUTH_TTL_SECONDS });
}

function verifyReauthToken(token, purpose) {
  const payload = jwt.verify(token, env.jwt.accessSecret);
  if (payload.purpose !== purpose) throw new Error('Wrong re-auth purpose.');
  return payload;
}

// Refresh tokens are opaque random values, never JWTs — only the sha256 hash is
// stored (blueprint §B refresh_tokens.token_hash), the raw value is never persisted.
function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  return { raw, hash, expiresAt };
}

function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken, signReauthToken, verifyReauthToken, REAUTH_TTL_SECONDS };
