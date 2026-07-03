const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { protect }         = require('../middleware/auth');
const { restrictTo }      = require('../middleware/roles');

router.use(protect);

router.get('/me',           ctrl.getMe);
router.patch('/me',         ctrl.updateMe);
router.get('/me/profile',   ctrl.getMyProfile);
router.patch('/me/profile', ctrl.updateMyProfile);

// Admin only
router.get('/',               restrictTo('admin', 'instructor'), ctrl.getAllUsers);
router.patch('/:id/status',   restrictTo('admin'), ctrl.setUserActive);

// Admin — Instructor verification management
router.get('/instructors/pending',  restrictTo('admin'), ctrl.getPendingInstructors);
router.patch('/:id/verify',        restrictTo('admin'), ctrl.verifyInstructor);
router.patch('/:id/reject',        restrictTo('admin'), ctrl.rejectInstructor);
router.patch('/:id/blacklist',     restrictTo('admin'), ctrl.toggleUserBlacklist);
router.delete('/:id',              restrictTo('admin'), ctrl.deleteUser);

module.exports = router;
