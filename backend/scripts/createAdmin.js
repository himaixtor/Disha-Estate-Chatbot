// Creates (or updates the password of) the first super_admin user.
// Usage: npm run create-admin -- --email you@disha-estate.com --password "Something Strong" --name "Your Name"
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg, i, arr) => {
    if (arg.startsWith('--')) args[arg.slice(2)] = arr[i + 1];
  });
  return args;
}

const SUPER_ADMIN_ROLE_UID = '11111111-1111-4111-8111-111111111111';

async function main() {
  const { email, password, name } = parseArgs();
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- --email you@disha-estate.com --password "..." --name "Your Name"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'disha-chatbot',
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await conn.query('SELECT uid FROM users WHERE email = ?', [email]);

  if (existing.length) {
    await conn.query('UPDATE users SET password_hash = ?, is_active = 1, failed_login_attempts = 0, locked_until = NULL WHERE email = ?', [passwordHash, email]);
    console.log(`Updated password for existing admin ${email}.`);
  } else {
    const uid = randomUUID();
    await conn.query(
      'INSERT INTO users (uid, email, name, password_hash, role_uid) VALUES (?, ?, ?, ?, ?)',
      [uid, email, name || 'Admin', passwordHash, SUPER_ADMIN_ROLE_UID]
    );
    console.log(`Created super_admin ${email}.`);
  }

  await conn.end();
}

main().catch((err) => {
  console.error('create-admin failed:', err.message);
  process.exit(1);
});
