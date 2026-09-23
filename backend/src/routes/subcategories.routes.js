const router = require('express').Router();
const ctrl = require('../controllers/subcategoriesController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { licenseGuard } = require('../middleware/licenseGuard');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.get('/', requireAuth, licenseGuard, requirePermission('can_access_dashboard'), ctrl.listAdmin);
router.post('/', requireAuth, licenseGuard, requirePermission('can_manage_categories'), validateBody(schemas.subcategoryCreate), ctrl.create);
router.patch('/:id', requireAuth, licenseGuard, requirePermission('can_manage_categories'), validateBody(schemas.subcategoryUpdate), ctrl.update);

module.exports = router;
