const { ApiError } = require('../utils/apiResponse');

// Every protected admin route re-checks permissions here — frontend route guards
// are never trusted as the source of truth (blueprint §30 / §55).
function requirePermission(permissionKey) {
  return function (req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required.'));
    }
    if (!req.user.permissions || !req.user.permissions[permissionKey]) {
      return next(new ApiError(403, 'FORBIDDEN', `Your role does not have the "${permissionKey}" permission.`));
    }
    next();
  };
}

module.exports = { requirePermission };
