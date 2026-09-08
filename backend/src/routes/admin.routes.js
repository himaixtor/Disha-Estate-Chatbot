const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(requireAuth);
router.get('/dashboard', requirePermission('can_access_dashboard'), ctrl.dashboard);
router.get('/users', requirePermission('can_manage_users'), ctrl.listUsers);
router.get('/roles', requirePermission('can_manage_users'), ctrl.listRoles);
router.post('/users', requirePermission('can_manage_users'), validateBody(schemas.createUser), ctrl.createUser);
router.patch('/users/:uid/active', requirePermission('can_manage_users'), ctrl.setUserActive);

module.exports = router;
