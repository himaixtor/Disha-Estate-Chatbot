const bcrypt = require('bcryptjs');

// bcryptjs (pure JS) deliberately chosen over native bcrypt/argon2 bindings —
// this backend has to install cleanly on whatever OS a future project's
// developers use, with no native build step. See blueprint § Module architecture.
const SALT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
