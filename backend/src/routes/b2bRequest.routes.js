const router = require('express').Router();
const ctrl = require('../controllers/b2bRequest.controller');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roles');

// Public route to submit request
router.post('/', ctrl.createRequest);

// Admin-only routes
router.get('/', protect, restrictTo('admin'), ctrl.getAllRequests);
router.patch('/:id', protect, restrictTo('admin'), ctrl.updateRequestStatus);

module.exports = router;
