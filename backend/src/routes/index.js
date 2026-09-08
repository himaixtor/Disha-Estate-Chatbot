const router = require('express').Router();

router.use('/health', require('./health.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/subcategories', require('./subcategories.routes'));
router.use('/service-sectors', require('./serviceSectors.routes'));
router.use('/leads', require('./leads.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/licenses', require('./licenses.routes'));
router.use('/ai', require('./ai.routes'));

module.exports = router;
