const { verifyAccessToken } = require('../utils/tokens');
const { ApiError } = require('../utils/apiResponse');

// Verifies the admin JWT and attaches req.user. Used only on /admin-side routes —
// the public /chat/* routes use session-scoped auth instead (see chat.routes.js).
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'Missing or malformed Authorization header.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { uid: payload.sub, roleUid: payload.role, roleLevel: payload.roleLevel || null, permissions: payload.permissions || {} };
    next();
  } catch (err) {
    next(new ApiError(401, 'UNAUTHENTICATED', 'Access token is invalid or has expired.'));
  }
}

module.exports = { requireAuth };
