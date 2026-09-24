const router = require('express').Router();
const ctrl = require('../controllers/licensesController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireReauth, requireReauthUnlessLicenseSetup } = require('../middleware/reauth');
const { validateBody } = require('../middleware/validate');
const schemas = require('../validators/schemas');

const REAUTH_PURPOSE = 'license_management';

router.get('/:licenseId/validate', ctrl.validate); // called by the app's own bootstrap, not admin-gated

// Any authenticated admin-portal user may check system license status — this
// is deliberately NOT behind licenseGuard/can_access_license_management, since
// it's exactly what a blocked user's screen polls to see if access has been restored.
router.get('/status', requireAuth, ctrl.status);

router.use(requireAuth, requirePermission('can_access_license_management'));

// Issuing a license is also what the mandatory setup screen does right after
// sign-in, so it only needs the password step-up once a valid license exists.
router.post('/', requireReauthUnlessLicenseSetup(REAUTH_PURPOSE), validateBody(schemas.licenseCreate), ctrl.create);

// Everything else in License Management needs a fresh password confirmation.
router.use(requireReauth(REAUTH_PURPOSE));
router.get('/', ctrl.list);
router.get('/current', ctrl.current);
router.get('/current/download', ctrl.download);
router.post('/:id/activate', ctrl.activate);
router.post('/:id/suspend', ctrl.suspend);
router.post('/:id/renew', ctrl.renew);

module.exports = router;
