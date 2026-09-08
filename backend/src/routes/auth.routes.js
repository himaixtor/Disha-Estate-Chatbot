const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const schemas = require('../validators/schemas');

router.post('/login', authLimiter, validateBody(schemas.login), ctrl.login);
router.post('/refresh', authLimiter, validateBody(schemas.refreshToken), ctrl.refresh);
router.post('/logout', validateBody(schemas.refreshToken), ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
