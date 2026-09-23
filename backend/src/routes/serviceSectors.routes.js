const router = require('express').Router();
const ctrl = require('../controllers/serviceSectorsController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { licenseGuard } = require('../middleware/licenseGuard');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.get('/', ctrl.listPublic);
router.get('/admin/all', requireAuth, licenseGuard, requirePermission('can_access_dashboard'), ctrl.listAdmin);
router.post('/', requireAuth, licenseGuard, requirePermission('can_manage_users'), validateBody(schemas.serviceSectorCreate), ctrl.create);
router.patch('/:id', requireAuth, licenseGuard, requirePermission('can_manage_users'), validateBody(schemas.serviceSectorUpdate), ctrl.update);

module.exports = router;
