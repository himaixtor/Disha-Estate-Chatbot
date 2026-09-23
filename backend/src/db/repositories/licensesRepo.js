const { pool } = require('../../config/db');

async function list() {
  const [rows] = await pool.query('SELECT * FROM licenses ORDER BY created_timestamp DESC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM licenses WHERE id = :id', { id });
  return rows[0] || null;
}

async function findByLicenseId(licenseId) {
  const [rows] = await pool.query('SELECT * FROM licenses WHERE license_id = :licenseId', { licenseId });
  return rows[0] || null;
}

async function create(fields) {
  const [result] = await pool.query(
    `INSERT INTO licenses
      (license_id, client_name, company_address, company_contact, company_email, product_name,
       deployment_type, max_users, max_admin_users, max_token_usage_charge, license_type, environment,
       remarks, status, valid_from, valid_till, created_date, assigned_date, created_by, created_by_email,
       license_version)
     VALUES
      (:licenseId, :clientName, :companyAddress, :companyContact, :companyEmail, :productName,
       :deploymentType, :maxUsers, :maxAdminUsers, :maxTokenUsageCharge, :licenseType, :environment,
       :remarks, :status, :validFrom, :validTill, :createdDate, :assignedDate, :createdBy, :createdByEmail,
       :licenseVersion)`,
    {
      licenseId: fields.licenseId,
      clientName: fields.clientName || null,
      companyAddress: fields.companyAddress || null,
      companyContact: fields.companyContact || null,
      companyEmail: fields.companyEmail || null,
      productName: fields.productName || null,
      deploymentType: fields.deploymentType || 'cloud',
      maxUsers: fields.maxUsers ?? 0,
      maxAdminUsers: fields.maxAdminUsers ?? 0,
      maxTokenUsageCharge: fields.maxTokenUsageCharge ?? 0,
      licenseType: fields.licenseType || 'standard',
      environment: fields.environment || 'development',
      remarks: fields.remarks || null,
      status: fields.status || 'active',
      validFrom: fields.validFrom || null,
      validTill: fields.validTill || null,
      createdDate: fields.createdDate || new Date().toISOString().slice(0, 10),
      assignedDate: fields.assignedDate || null,
      createdBy: fields.createdBy || null,
      createdByEmail: fields.createdByEmail || null,
      licenseVersion: fields.licenseVersion || '1.0',
    }
  );
  return result.insertId;
}

async function setStatus(id, status) {
  await pool.query('UPDATE licenses SET status = :status WHERE id = :id', { id, status });
}

// license.txt binding (see licenseFileService) — the file's own sha256 is
// stored here so a swapped-in or stale-but-still-decryptable file can be
// told apart from the one that was actually issued for this row.
async function setFileMeta(id, { filePath, fileHash }) {
  await pool.query(
    'UPDATE licenses SET license_file_path = :filePath, license_file_hash = :fileHash WHERE id = :id',
    { id, filePath, fileHash }
  );
}

async function clearTamper(id) {
  await pool.query('UPDATE licenses SET is_tampered = 0, tamper_detected_at = NULL WHERE id = :id', { id });
}

// Best-effort: flags whichever DB row currently claims the given file path as
// tampered, so the admin UI can surface which license failed integrity
// validation even though the file itself could no longer be trusted to say.
async function markTamperedByFilePath(filePath) {
  await pool.query(
    'UPDATE licenses SET is_tampered = 1, tamper_detected_at = NOW() WHERE license_file_path = :filePath',
    { filePath }
  );
}

module.exports = { list, findById, findByLicenseId, create, setStatus, setFileMeta, clearTamper, markTamperedByFilePath };
