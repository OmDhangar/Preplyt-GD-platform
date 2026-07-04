const router = require('express').Router();

router.use('/auth',          require('./auth.routes'));
router.use('/users',         require('./user.routes'));
router.use('/sessions',      require('./gdSession.routes'));
router.use('/templates',     require('./template.routes'));
router.use('/evaluations',   require('./evaluation.routes'));
router.use('/payments',      require('./payment.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/dashboard',     require('./dashboard.routes'));
router.use('/b2b-requests',  require('./b2bRequest.routes'));
router.use('/feedback',      require('./feedback.routes'));

module.exports = router;

