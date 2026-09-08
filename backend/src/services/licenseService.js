const licensesRepo = require('../db/repositories/licensesRepo');
const { ApiError } = require('../utils/apiResponse');

// Server-side license validation (blueprint §40) — never trust a frontend
// check. This is intentionally simple for Release 1: status + date window +
// environment match. Token-usage-cap enforcement plugs in once Release 2's
// token_usage ledger is live (blueprint Issue G17).
async function validate(licenseId, environment) {
  const license = await licensesRepo.findByLicenseId(licenseId);
  if (!license) throw new ApiError(404, 'LICENSE_NOT_FOUND', 'Unknown license.');
  if (license.status !== 'active') throw new ApiError(403, 'LICENSE_INACTIVE', `License is ${license.status}.`);
  if (license.is_tampered) throw new ApiError(403, 'LICENSE_TAMPERED', 'License failed integrity validation.');
  if (environment && license.environment !== environment) {
    throw new ApiError(403, 'LICENSE_ENVIRONMENT_MISMATCH', 'License is not valid for this environment.');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (license.valid_till && license.valid_till < today) {
    throw new ApiError(403, 'LICENSE_EXPIRED', 'License validity period has ended.');
  }
  return { valid: true, license };
}

module.exports = { validate };
