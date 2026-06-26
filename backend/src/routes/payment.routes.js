const router = require('express').Router();
const ctrl   = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

// Webhook uses raw body — must come BEFORE protect (no auth header from Razorpay)
router.post('/webhook', ctrl.handleWebhook);

router.use(protect);

router.post('/order',                    ctrl.createOrder);
router.post('/verify',                   ctrl.verifyPayment);
router.get('/session/:sessionId/status', ctrl.getSessionPaymentStatus);
router.get('/history',                   ctrl.getPaymentHistory);

module.exports = router;
