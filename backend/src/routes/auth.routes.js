const router  = require('express').Router();
const ctrl    = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate    = require('../middleware/validate');
const {
  registerRules, loginRules, forgotPasswordRules,
  resetPasswordRules, refreshTokenRules,
} = require('../utils/validators/auth.validator');

router.post('/register',        registerRules,       validate, ctrl.register);
router.post('/login',           loginRules,          validate, ctrl.login);
router.post('/google',                                       ctrl.googleLogin);
router.post('/refresh',         refreshTokenRules,   validate, ctrl.refreshToken);
router.post('/logout',          protect,                       ctrl.logout);
router.get( '/verify/:token',                                  ctrl.verifyEmail);
router.post('/forgot-password', forgotPasswordRules, validate, ctrl.forgotPassword);
router.patch('/reset-password/:token', resetPasswordRules, validate, ctrl.resetPassword);

// Google Calendar connection routes
router.get('/google/connect-url',  protect, ctrl.getGoogleConnectUrl);
router.post('/google/callback',    protect, ctrl.googleCallback);
router.delete('/google/disconnect', protect, ctrl.googleDisconnect);

module.exports = router;
