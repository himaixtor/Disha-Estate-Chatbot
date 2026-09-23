// Shared shape for "who is signed in" — used by both POST /auth/login and
// GET /auth/me so the two never drift apart. Bundles the current system
// license status onto the user object so the frontend can decide, right
// after sign-in, whether to show the app, the mandatory license setup screen
// (super admins), or a blocked screen (everyone else) — see licenseGuard.js
// and rolesService.js for the enforcement side of both of these.
const rolesRepo = require('../db/repositories/rolesRepo');
const licenseFileService = require('./licenseFileService');

async function buildSessionUser(user, role) {
  const licenseResult = await licenseFileService.verify();
  return {
    uid: user.uid,
    email: user.email,
    name: user.name,
    role: role?.role_name || null,
    roleLevel: role?.role_level || null,
    permissions: rolesRepo.toPermissions(role),
    license: {
      status: licenseResult.status,
      reason: licenseResult.reason || null,
      licenseId: licenseResult.license?.license_id || null,
      clientName: licenseResult.license?.client_name || null,
      productName: licenseResult.license?.product_name || null,
      environment: licenseResult.license?.environment || null,
      validTill: licenseResult.license?.valid_till || null,
    },
  };
}

module.exports = { buildSessionUser };
