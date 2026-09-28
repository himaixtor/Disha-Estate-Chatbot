const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const { validateBody } = require('../middleware/validate');
const { chatLimiter, otpLimiter } = require('../middleware/rateLimiter');
const schemas = require('../validators/schemas');

router.use(chatLimiter);

router.post('/session', ctrl.createSession);
router.get('/session/:id', ctrl.getSession);
router.post('/session/:id/name', validateBody(schemas.chatName), ctrl.submitName);
router.post('/session/:id/mobile', validateBody(schemas.chatMobile), ctrl.submitMobile);
router.post('/session/:id/otp/verify', otpLimiter, validateBody(schemas.chatOtp), ctrl.verifyOtp);
router.post('/session/:id/otp/resend', otpLimiter, ctrl.resendOtp);
router.post('/session/:id/mobile/change', ctrl.changeMobile);
router.post('/session/:id/category', validateBody(schemas.chatCategory), ctrl.selectCategory);
router.post('/session/:id/subcategory', validateBody(schemas.chatSubcategory), ctrl.selectSubcategory);
router.post('/session/:id/location', validateBody(schemas.chatLocation), ctrl.submitLocation);
router.post('/session/:id/back', ctrl.goBack);
router.post('/session/:id/main-menu', ctrl.mainMenu);

module.exports = router;
