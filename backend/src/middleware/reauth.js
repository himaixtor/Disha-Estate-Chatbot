const { verifyReauthToken } = require('../utils/tokens');
const { ApiError } = require('../utils/apiResponse');
const licenseFileService = require('../services/licenseFileService');

// Requires a valid step-up token (see authService.reauthenticate) in the
// X-Reauth-Token header, issued to the same user for the given purpose.
// Must run after requireAuth. Fails with 403 REAUTH_REQUIRED (not 401) so the
// Admin Portal re-prompts for the password instead of signing the user out.
function requireReauth(purpose) {
  return (req, res, next) => {
    const token = req.headers['x-reauth-token'];
    if (!token) return next(new ApiError(403, 'REAUTH_REQUIRED', 'Please re-enter your password to continue.'));
    try {
      const payload = verifyReauthToken(token, purpose);
      if (payload.sub !== req.user?.uid) throw new Error('User mismatch.');
      next();
    } catch {
      next(new ApiError(403, 'REAUTH_REQUIRED', 'Your verification has expired. Please re-enter your password.'));
    }
  };
}

// Same as requireReauth, except it is skipped while the system has no valid
// license — the mandatory first-time / recovery setup screen (LicenseSetupPage)
// runs right after sign-in and must still be able to issue a license.
function requireReauthUnlessLicenseSetup(purpose) {
  const guard = requireReauth(purpose);
  return (req, res, next) => {
    licenseFileService.verify()
      .then((result) => (result.status === 'valid' ? guard(req, res, next) : next()))
      .catch(next);
  };
}

module.exports = { requireReauth, requireReauthUnlessLicenseSetup };
