const router = require('express').Router();
const ctrl   = require('../controllers/evaluation.controller');
const { protect }    = require('../middleware/auth');
const { restrictTo } = require('../middleware/roles');
const validate       = require('../middleware/validate');
const { batchUpdateRules, submitRules, publishRules } = require('../utils/validators/evaluation.validator');

router.use(protect);

// Batch upsert — the sole DB write path for live evaluation (called every ~5s)
router.patch('/batch',
  restrictTo('instructor', 'admin'),
  batchUpdateRules, validate,
  ctrl.batchUpdateEvaluations
);

// Session-scoped evaluation routes
router.get('/sessions/:sessionId/evaluations',
  restrictTo('instructor', 'admin'),
  ctrl.getSessionEvaluations
);

router.get('/sessions/:sessionId/evaluations/:studentId',
  restrictTo('instructor', 'admin'),
  ctrl.getEvaluationRecord
);

router.patch('/sessions/:sessionId/evaluations/:studentId/submit',
  restrictTo('instructor', 'admin'),
  submitRules, validate,
  ctrl.submitEvaluation
);

// Publish: instructor publishes results so students can see them
router.post('/sessions/:sessionId/evaluations/publish',
  restrictTo('instructor', 'admin'),
  publishRules, validate,
  ctrl.publishEvaluations
);

// Results: accessible by both instructors and students (filtered by role)
router.get('/sessions/:sessionId/results',
  ctrl.getPublishedResults
);

module.exports = router;
