// Mirrors backend/src/services/rolesService.js — client-side only for UX
// (hiding/disabling choices the server would reject anyway); the server is
// the real enforcement point for every one of these rules.
export const LEVEL_LABELS = { super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager', viewer: 'Viewer', other: 'Other' };
export const ALL_LEVELS = ['super_admin', 'admin', 'manager', 'viewer', 'other'];

export function assignableLevels(roleLevel) {
  if (roleLevel === 'super_admin') return ALL_LEVELS;
  if (roleLevel === 'admin') return ['manager', 'viewer', 'other'];
  return [];
}
