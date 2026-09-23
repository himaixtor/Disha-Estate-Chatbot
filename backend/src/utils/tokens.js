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
  return jwt.verify(token, env.jwt.accessSecret);
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

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken };
