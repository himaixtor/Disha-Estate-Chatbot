const licensesRepo = require('../db/repositories/licensesRepo');
const licenseService = require('../services/licenseService');
const licenseFileService = require('../services/licenseFileService');
const { invalidateLicenseCache } = require('../middleware/licenseGuard');
const usersRepo = require('../db/repositories/usersRepo');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = { list, create, activate: setStatus('active'), suspend: setStatus('suspended'), renew: setStatus('active'), validate, status };
