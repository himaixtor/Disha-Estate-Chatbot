// Role-management hierarchy (blueprint §30 update — "Roles management").
// role_level controls who may create/edit/delete a role, or assign it to a
// user — separately from the roles.can_* feature-permission booleans, which
// control what THAT role's own users can do once signed in.
const { ApiError } = require('../utils/apiResponse');

const LEVELS = ['super_admin', 'admin', 'manager', 'viewer', 'other'];

// super_admin: full access, including managing admin-level roles/users.
// admin: only manager/viewer/other — never admin or super_admin.
// manager/viewer/other: no role-management scope of their own.
function assignableLevels(actorLevel) {
  if (actorLevel === 'super_admin') return LEVELS;
  if (actorLevel === 'admin') return ['manager', 'viewer', 'other'];
  return [];
}

function canManageLevel(actorLevel, targetLevel) {
  return assignableLevels(actorLevel).includes(targetLevel);
}

function assertCanManageLevel(actorLevel, targetLevel) {
  if (!canManageLevel(actorLevel, targetLevel)) {
    throw new ApiError(
      403,
      'ROLE_SCOPE_FORBIDDEN',
      `Your role cannot manage roles or users at the "${targetLevel}" level.`
    );
  }
}

module.exports = { LEVELS, assignableLevels, canManageLevel, assertCanManageLevel };
