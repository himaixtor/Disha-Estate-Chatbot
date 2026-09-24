const licensesRepo = require('../db/repositories/licensesRepo');
const licenseService = require('../services/licenseService');
const licenseFileService = require('../services/licenseFileService');
const { invalidateLicenseCache } = require('../middleware/licenseGuard');
const usersRepo = require('../db/repositories/usersRepo');
const { ok } = require('../utils/apiResponse');
const { ApiError } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const fs = require('fs');

const list = asyncHandler(async (req, res) => ok(res, await licensesRepo.list()));

// Creates the DB record AND (re)issues the encrypted license.txt that binds
// to it — this is what "starts" license protection for the whole Admin
// Portal (blueprint §40 update). Any previously-installed license.txt is
// overwritten, so creating a new license always becomes the active one.
const create = asyncHandler(async (req, res) => {
  const creator = await usersRepo.findByUid(req.user.uid);
  const id = await licensesRepo.create({ ...req.body, createdBy: req.user.uid, createdByEmail: creator?.email });
  const license = await licensesRepo.findById(id);
  await licenseFileService.issue(license.license_id);
  invalidateLicenseCache();
  ok(res, { id }, 'License created.', 201);
});

const setStatus = (status) => asyncHandler(async (req, res) => {
  await licensesRepo.setStatus(req.params.id, status);
  invalidateLicenseCache();
  ok(res, {}, `License ${status}.`);
});

const validate = asyncHandler(async (req, res) => {
  const result = await licenseService.validate(req.params.licenseId, req.query.environment);
  ok(res, result);
});

// Current system-wide license status, as enforced by licenseGuard — used by
// the Admin Portal to decide whether to show the mandatory license setup
// screen (super admins) or a blocked screen (everyone else).
const status = asyncHandler(async (req, res) => {
  const result = await licenseFileService.verify();
  ok(res, {
    status: result.status,
    reason: result.reason || null,
    license: result.license ? {
      licenseId: result.license.license_id,
      clientName: result.license.client_name,
      productName: result.license.product_name,
      environment: result.license.environment,
      validTill: result.license.valid_till,
    } : null,
  });
});

// Full details of the license currently installed in license.txt — what the
// License Management "Overview" and "Details" tabs render. Returns the DB row
// even when the license is expired/suspended so the page can explain why.
function toDetails(license, status) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const till = license.valid_till ? new Date(license.valid_till) : null;
  const daysRemaining = till ? Math.max(0, Math.round((till - today) / 86400000)) : null;
  return {
    id: license.id,
    licenseId: license.license_id,
    clientName: license.client_name,
    productName: license.product_name,
    licenseType: license.license_type,
    deploymentType: license.deployment_type,
    environment: license.environment,
    status: license.status,
    systemStatus: status,
    validFrom: license.valid_from,
    validTill: license.valid_till,
    daysRemaining,
    maxUsers: license.max_users,
    maxAdminUsers: license.max_admin_users,
    maxTokenUsageCharge: Number(license.max_token_usage_charge),
    createdBy: license.created_by_email,
    createdDate: license.created_date,
    companyEmail: license.company_email,
    companyContact: license.company_contact,
    companyAddress: license.company_address,
    remarks: license.remarks,
    licenseVersion: license.license_version,
    isTampered: !!license.is_tampered,
  };
}

const current = asyncHandler(async (req, res) => {
  const result = await licenseFileService.verify();
  if (!result.license) {
    return ok(res, { systemStatus: result.status, reason: result.reason || null, license: null });
  }
  ok(res, { systemStatus: result.status, reason: result.reason || null, license: toDetails(result.license, result.status) });
});

// Returns the installed (encrypted) license.txt so a super admin can keep a
// backup copy. Sent as JSON so it goes through the normal authenticated
// API client; the Admin Portal turns it into a file download.
const download = asyncHandler(async (req, res) => {
  const result = await licenseFileService.verify();
  if (!result.license || !fs.existsSync(licenseFileService.FILE_PATH)) {
    throw new ApiError(404, 'LICENSE_NOT_FOUND', 'No installed license file to download.');
  }
  const content = fs.readFileSync(licenseFileService.FILE_PATH, 'utf8');
  ok(res, { fileName: `license-${result.license.license_id}.txt`, content });
});

module.exports = { list, current, download, create, activate: setStatus('active'), suspend: setStatus('suspended'), renew: setStatus('active'), validate, status };
