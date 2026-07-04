const router = require('express').Router();
const ctrl = require('../controllers/feedback.controller');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roles');
const { param, body } = require('express-validator');
const validate = require('../middleware/validate');

router.use(protect);

// Admin-only feedback analytics dashboard
router.get('/admin/analytics',
  restrictTo('admin'),
  ctrl.getAdminFeedbackAnalytics
);

// Submit student feedback
router.post('/sessions/:sessionId/feedback',
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    body('rating')
      .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters'),
  ],
  validate,
  ctrl.submitFeedback
);

// Get feedback for a session
router.get('/sessions/:sessionId/feedback',
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
  ],
  validate,
  ctrl.getSessionFeedback
);

module.exports = router;
