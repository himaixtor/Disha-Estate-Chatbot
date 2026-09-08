const router = require('express').Router();
const ctrl = require('../controllers/categoriesController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.get('/', ctrl.listPublic);
router.get('/:id/subcategories', ctrl.subcategoriesForCategory);
router.get('/admin/all', requireAuth, requirePermission('can_access_dashboard'), ctrl.listAdmin);
router.post('/', requireAuth, requirePermission('can_manage_users'), validateBody(schemas.categoryCreate), ctrl.create);
router.patch('/:id', requireAuth, requirePermission('can_manage_users'), validateBody(schemas.categoryUpdate), ctrl.update);

module.exports = router;
