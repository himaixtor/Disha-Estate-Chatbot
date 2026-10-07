const router = require('express').Router();
const ctrl = require('../controllers/propertyConfigurationsController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { licenseGuard } = require('../middleware/licenseGuard');

router.get('/', requireAuth, licenseGuard, requirePermission('can_manage_categories'), ctrl.list);

module.exports = router;
