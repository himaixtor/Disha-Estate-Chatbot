const router = require('express').Router();
const ctrl = require('../controllers/subcategoriesController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.get('/', requireAuth, requirePermission('can_access_dashboard'), ctrl.listAdmin);
router.post('/', requireAuth, requirePermission('can_manage_users'), validateBody(schemas.subcategoryCreate), ctrl.create);
router.patch('/:id', requireAuth, requirePermission('can_manage_users'), validateBody(schemas.subcategoryUpdate), ctrl.update);

module.exports = router;
