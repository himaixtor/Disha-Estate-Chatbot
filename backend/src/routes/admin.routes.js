const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { licenseGuard } = require('../middleware/licenseGuard');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(requireAuth, licenseGuard);

router.get('/dashboard', requirePermission('can_access_dashboard'), ctrl.dashboard);

router.get('/users', requirePermission('can_manage_users'), ctrl.listUsers);
router.post('/users', requirePermission('can_manage_users'), validateBody(schemas.createUser), ctrl.createUser);
router.patch('/users/:uid/active', requirePermission('can_manage_users'), ctrl.setUserActive);
router.patch('/users/:uid/role', requirePermission('can_manage_users'), validateBody(schemas.setUserRole), ctrl.setUserRole);

// Roles management (blueprint §30 update — "Roles management"): reading the
// list stays under can_manage_users so the Users page can populate its role
// picker; creating/editing/deleting a role needs can_manage_roles, and every
// mutation is additionally scoped by role hierarchy in the controller.
router.get('/roles', requirePermission('can_manage_users'), ctrl.listRoles);
router.post('/roles', requirePermission('can_manage_roles'), validateBody(schemas.roleCreate), ctrl.createRole);
router.patch('/roles/:uid', requirePermission('can_manage_roles'), validateBody(schemas.roleUpdate), ctrl.updateRole);
router.delete('/roles/:uid', requirePermission('can_manage_roles'), ctrl.deleteRole);

module.exports = router;
