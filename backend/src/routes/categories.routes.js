const router = require('express').Router();
const ctrl = require('../controllers/categoriesController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { licenseGuard } = require('../middleware/licenseGuard');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.get('/', ctrl.listPublic);
router.get('/:id/subcategories', ctrl.subcategoriesForCategory);
router.get('/admin/all', requireAuth, licenseGuard, requirePermission('can_access_dashboard'), ctrl.listAdmin);
router.post('/sync', requireAuth, licenseGuard, requirePermission('can_manage_categories'), ctrl.sync);
router.post('/', requireAuth, licenseGuard, requirePermission('can_manage_categories'), validateBody(schemas.categoryCreate), ctrl.create);
router.patch('/:id', requireAuth, licenseGuard, requirePermission('can_manage_categories'), validateBody(schemas.categoryUpdate), ctrl.update);

module.exports = router;
