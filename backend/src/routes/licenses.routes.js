const router = require('express').Router();
const ctrl = require('../controllers/licensesController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.get('/:licenseId/validate', ctrl.validate); // called by the app's own bootstrap, not admin-gated

router.use(requireAuth, requirePermission('can_access_license_management'));
router.get('/', ctrl.list);
router.post('/', validateBody(schemas.licenseCreate), ctrl.create);
router.post('/:id/activate', ctrl.activate);
router.post('/:id/suspend', ctrl.suspend);
router.post('/:id/renew', ctrl.renew);

module.exports = router;
