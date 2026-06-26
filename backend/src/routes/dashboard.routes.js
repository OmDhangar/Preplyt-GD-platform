const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { protect }    = require('../middleware/auth');
const { restrictTo } = require('../middleware/roles');

router.use(protect);

router.get('/instructor',          restrictTo('instructor', 'admin'), ctrl.getInstructorDashboard);
router.get('/student',             restrictTo('student'),             ctrl.getStudentDashboard);
router.get('/session/:sessionId',  restrictTo('instructor', 'admin'), ctrl.getSessionBoard);

module.exports = router;
