// Blocks the Admin Portal API once the system license is missing, tampered,
// expired or inactive (blueprint §40 update — "license-protected solution").
// Deliberately NOT applied to /auth/* or /licenses/* — a super admin must
// always be able to sign in and reach license management to fix things;
// every other authenticated admin route is gated here.
const licenseFileService = require('../services/licenseFileService');
const { ApiError } = require('../utils/apiResponse');

const CACHE_MS = 15000; // avoid re-reading/decrypting the file on every request
let cached = null; // { at, result }

async function getStatus() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.result;
  const result = await licenseFileService.verify();
  cached = { at: Date.now(), result };
  return result;
}

function invalidateLicenseCache() {
  cached = null;
}

const MESSAGES = {
  not_configured: 'No license has been installed yet. A super admin must complete license setup.',
  tampered: 'The installed license failed integrity validation. Access has been suspended for all users.',
  expired: 'The installed license has expired.',
  inactive: 'The installed license is not currently active.',
};

function licenseGuard(req, res, next) {
  getStatus()
    .then((result) => {
      req.licenseStatus = result;
      if (result.status === 'valid') return next();
      next(new ApiError(403, `LICENSE_${result.status.toUpperCase()}`, MESSAGES[result.status] || 'The system license is invalid.'));
    })
    .catch(next);
}

module.exports = { licenseGuard, invalidateLicenseCache };
