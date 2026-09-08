const router = require('express').Router();
const { ask } = require('../controllers/aiController');
// Public + session-scoped, same as /chat/*. Workflow-stage gating (only after
// SHOW_RESULTS) is Release 2 work — see blueprint §C note on this route.
router.post('/chat-stream', ask);
module.exports = router;
