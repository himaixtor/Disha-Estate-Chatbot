// Issues and verifies the single license.txt that gates access to the Admin
// Portal (blueprint §40 update — "license-protected solution").
//
// license.txt holds an AES-256-GCM authenticated-encrypted blob of the
// license's canonical fields. GCM's authentication tag means ANY direct edit
// to the file — even one byte — makes decryption fail outright; that failure
// *is* the tamper signal, so no separate checksum/signature scheme is needed
// for the file itself. On top of that, the encrypted payload's own sha256 is
// also stored on the licenses DB row (license_file_hash), which binds the
// file to one specific, un-tampered database record ("connected with the
// database") — a file that decrypts fine but doesn't match any DB row (e.g.
// the row was deleted, or the file was swapped for an old one) is also
// treated as invalid.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const licensesRepo = require('../db/repositories/licensesRepo');

const FILE_PATH = env.license.filePath;

function deriveKey() {
  // Any length/format passphrase in LICENSE_ENCRYPTION_KEY works — it's
  // hashed down to exactly 32 bytes for AES-256.
  return crypto.createHash('sha256').update(String(env.license.encryptionKey)).digest();
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString('base64')).join('.');
}

// Throws if the file was ever touched outside issue() — that's the point.
function decrypt(blob) {
  const parts = String(blob).trim().split('.');
  if (parts.length !== 3) throw new Error('Malformed license file.');
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}

function canonicalPayload(license) {
  return JSON.stringify({
    licenseId: license.license_id,
    clientName: license.client_name,
    productName: license.product_name,
    licenseType: license.license_type,
    environment: license.environment,
    deploymentType: license.deployment_type,
    maxUsers: license.max_users,
    maxAdminUsers: license.max_admin_users,
    maxTokenUsageCharge: Number(license.max_token_usage_charge),
    validFrom: license.valid_from,
    validTill: license.valid_till,
    dbId: license.id,
    issuedAt: new Date().toISOString(),
  });
}

// Writes/overwrites license.txt for the given license and links it back to
// the DB row via license_file_path + license_file_hash.
async function issue(licenseId) {
  const license = await licensesRepo.findByLicenseId(licenseId);
  if (!license) throw new Error(`Cannot issue license.txt: no license record for "${licenseId}".`);

  const payload = canonicalPayload(license);
  const hash = crypto.createHash('sha256').update(payload).digest('hex');
  const encrypted = encrypt(payload);

  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, encrypted, { mode: 0o600 });

  await licensesRepo.setFileMeta(license.id, { filePath: FILE_PATH, fileHash: hash });
  await licensesRepo.clearTamper(license.id);
  return { filePath: FILE_PATH };
}

// Reads license.txt and returns the current system license status. Never
// throws — every failure mode (missing file, tamper, DB mismatch, expiry,
// inactive status) resolves to a status string the caller can act on.
async function verify() {
  if (!fs.existsSync(FILE_PATH)) return { status: 'not_configured' };

  let raw;
  try {
    raw = fs.readFileSync(FILE_PATH, 'utf8');
  } catch {
    return { status: 'not_configured' };
  }

  let payloadJson;
  try {
    payloadJson = decrypt(raw);
  } catch {
    await licensesRepo.markTamperedByFilePath(FILE_PATH);
    return { status: 'tampered', reason: 'The license file failed integrity validation.' };
  }

  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    await licensesRepo.markTamperedByFilePath(FILE_PATH);
    return { status: 'tampered', reason: 'The license file is corrupt.' };
  }

  const license = await licensesRepo.findByLicenseId(payload.licenseId);
  const expectedHash = crypto.createHash('sha256').update(payloadJson).digest('hex');
  if (!license || license.license_file_hash !== expectedHash || license.license_file_path !== FILE_PATH) {
    return { status: 'tampered', reason: 'The license file does not match any database record.' };
  }
  if (license.is_tampered) {
    return { status: 'tampered', license };
  }
  if (license.status !== 'active') {
    return { status: license.status === 'expired' ? 'expired' : 'inactive', license };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (license.valid_till && license.valid_till < today) {
    return { status: 'expired', license };
  }
  return { status: 'valid', license };
}

module.exports = { issue, verify, FILE_PATH };
