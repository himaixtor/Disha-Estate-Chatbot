const router = require('express').Router();
const ctrl = require('../controllers/leadsController');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(requireAuth);
router.get('/', requirePermission('can_view_all_chats'), ctrl.list);
router.get('/:sessionId', requirePermission('can_view_all_chats'), ctrl.detail);
router.patch('/:sessionId', requirePermission('can_manage_users'), ctrl.update);

module.exports = router;
