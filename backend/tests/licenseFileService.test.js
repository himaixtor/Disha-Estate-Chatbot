// Exercises the actual encrypt/verify/tamper-detection flow in
// licenseFileService against a throwaway file, with licensesRepo monkey-
// patched to an in-memory fake — no real MySQL needed. This is the
// highest-risk new logic in the license-protection feature (blueprint §40
// update), so it gets a real round-trip test rather than just a syntax check.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpFile = path.join(os.tmpdir(), `license-test-${process.pid}.txt`);
process.env.LICENSE_FILE_PATH = tmpFile;
process.env.LICENSE_ENCRYPTION_KEY = 'test-only-key-not-for-production';

const licensesRepo = require('../src/db/repositories/licensesRepo');
const licenseFileService = require('../src/services/licenseFileService');

// In-memory fake DB row + monkey-patched repo methods (same module instance
// licenseFileService imported, since require() caches by path).
let row = null;
licensesRepo.findByLicenseId = async (licenseId) => (row && row.license_id === licenseId ? row : null);
licensesRepo.findById = async (id) => (row && row.id === id ? row : null);
licensesRepo.setFileMeta = async (id, { filePath, fileHash }) => {
  if (row && row.id === id) { row.license_file_path = filePath; row.license_file_hash = fileHash; }
};
licensesRepo.clearTamper = async (id) => {
  if (row && row.id === id) { row.is_tampered = 0; row.tamper_detected_at = null; }
};
licensesRepo.markTamperedByFilePath = async (filePath) => {
  if (row && row.license_file_path === filePath) { row.is_tampered = 1; row.tamper_detected_at = new Date(); }
};

function freshRow(overrides = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: 1, license_id: 'DISHA-TEST-1', client_name: 'Acme', product_name: 'Disha Estate Management',
    license_type: 'standard', environment: 'production', deployment_type: 'cloud',
    max_users: 10, max_admin_users: 2, max_token_usage_charge: 0,
    valid_from: today, valid_till: nextYear, status: 'active',
    is_tampered: 0, license_file_path: null, license_file_hash: null,
    ...overrides,
  };
}

test.beforeEach(() => { try { fs.unlinkSync(tmpFile); } catch { /* ignore */ } });

test('no file yet -> not_configured', async () => {
  row = null;
  const result = await licenseFileService.verify();
  assert.equal(result.status, 'not_configured');
});

test('issue then verify -> valid, and binds file to the DB row', async () => {
  row = freshRow();
  await licenseFileService.issue('DISHA-TEST-1');
  assert.ok(fs.existsSync(tmpFile));
  assert.equal(row.license_file_path, tmpFile);
  assert.ok(row.license_file_hash);

  const result = await licenseFileService.verify();
  assert.equal(result.status, 'valid');
});

test('any direct edit to license.txt is detected as tampering (AES-GCM auth tag)', async () => {
  row = freshRow();
  await licenseFileService.issue('DISHA-TEST-1');

  // Simulate "any user touches that file and makes any changes directly" —
  // flip one character in the ciphertext.
  const original = fs.readFileSync(tmpFile, 'utf8');
  const parts = original.split('.');
  const flipped = parts[2].slice(0, -1) + (parts[2].slice(-1) === 'A' ? 'B' : 'A');
  fs.writeFileSync(tmpFile, [parts[0], parts[1], flipped].join('.'));

  const result = await licenseFileService.verify();
  assert.equal(result.status, 'tampered');
  assert.equal(row.is_tampered, 1);
});

test('expired license.txt -> expired (validity checked live against DB, not the file)', async () => {
  row = freshRow({ valid_till: '2000-01-01' });
  await licenseFileService.issue('DISHA-TEST-1');
  const result = await licenseFileService.verify();
  assert.equal(result.status, 'expired');
});

test('suspended license -> inactive', async () => {
  row = freshRow({ status: 'suspended' });
  await licenseFileService.issue('DISHA-TEST-1');
  const result = await licenseFileService.verify();
  assert.equal(result.status, 'inactive');
});

test('file present but DB row missing entirely -> tampered (file not connected to any DB record)', async () => {
  row = freshRow();
  await licenseFileService.issue('DISHA-TEST-1');
  row = null; // the "DB record was deleted/replaced" case
  const result = await licenseFileService.verify();
  assert.equal(result.status, 'tampered');
});

test.after(() => { try { fs.unlinkSync(tmpFile); } catch { /* ignore */ } });
