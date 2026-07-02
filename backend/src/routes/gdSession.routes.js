const router = require('express').Router();
const ctrl   = require('../controllers/gdSession.controller');
const { protect }           = require('../middleware/auth');
const { restrictTo }        = require('../middleware/roles');
const { requireVerified }   = require('../middleware/instructorVerified');
const validate              = require('../middleware/validate');
const upload                = require('../middleware/upload');
const {
  createSessionRules, updateSessionRules,
  sessionIdParam, assignStudentsRules, rescheduleSessionRules,
} = require('../utils/validators/session.validator');

// Public route to get upcoming sessions (accessible without login)
router.get('/public/upcoming', ctrl.getPublicUpcomingSessions);

router.use(protect);

// Middleware to map flat frontend price/currency to nested sessionFee expected by backend
const mapPriceToSessionFee = (req, res, next) => {
  const isPaid = req.body.requiresPayment === true || req.body.requiresPayment === 'true';
  if (isPaid) {
    if (req.body.price !== undefined && req.body.sessionFee === undefined) {
      req.body.sessionFee = {
        amount: Number(req.body.price),
        currency: req.body.currency || 'INR',
      };
    }
  }
  next();
};

// Public-ish: student uses join code to find a session before enrolling
router.get('/join/:joinCode', ctrl.getSessionByJoinCode);

// ── Admin: instructor-wise views (must be BEFORE /:sessionId to avoid conflicts) ──
router.get('/admin/by-instructor',
  restrictTo('admin'),
  ctrl.getSessionsGroupedByInstructor
);
router.get('/admin/by-instructor/:instructorId',
  restrictTo('admin'),
  ctrl.getSessionsByInstructor
);

// ── Instructor & admin CRUD ───────────────────────────────────────────────────
router.post('/',
  restrictTo('instructor', 'admin'),
  requireVerified,
  mapPriceToSessionFee,
  createSessionRules, validate,
  ctrl.createSession
);

router.get('/',
  restrictTo('instructor', 'admin', 'student'),
  ctrl.getSessions
);

router.get('/:sessionId',
  sessionIdParam, validate,
  ctrl.getSession
);

router.patch('/:sessionId',
  restrictTo('instructor', 'admin'),
  requireVerified,
  mapPriceToSessionFee,
  [...sessionIdParam, ...updateSessionRules], validate,
  ctrl.updateSession
);

router.delete('/:sessionId',
  restrictTo('instructor', 'admin'),
  requireVerified,
  sessionIdParam, validate,
  ctrl.deleteSession
);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.post('/:sessionId/start',
  restrictTo('instructor', 'admin'),
  requireVerified,
  sessionIdParam, validate,
  ctrl.startSession
);

router.post('/:sessionId/end',
  restrictTo('instructor', 'admin'),
  requireVerified,
  sessionIdParam, validate,
  ctrl.endSession
);

router.post('/:sessionId/google-meet',
  restrictTo('instructor', 'admin'),
  requireVerified,
  sessionIdParam, validate,
  ctrl.generateGoogleMeet
);

// ── Participants ──────────────────────────────────────────────────────────────
router.post('/:sessionId/participants',
  restrictTo('instructor', 'admin'),
  requireVerified,
  [...sessionIdParam, ...assignStudentsRules], validate,
  ctrl.assignStudents
);

router.get('/:sessionId/participants',
  sessionIdParam, validate,
  ctrl.getParticipants
);

router.post('/:sessionId/join',
  sessionIdParam, validate,
  ctrl.joinSession
);

// ── Attachments ───────────────────────────────────────────────────────────────
router.post('/:sessionId/attachments',
  restrictTo('instructor', 'admin'),
  requireVerified,
  upload.single('file'),
  sessionIdParam, validate,
  ctrl.addAttachment
);

router.delete('/:sessionId/attachments/:attachmentId',
  restrictTo('instructor', 'admin'),
  requireVerified,
  sessionIdParam, validate,
  ctrl.removeAttachment
);

router.get('/:sessionId/attachments',
  sessionIdParam, validate,
  ctrl.getAttachments
);

// ── Reschedule / Postpone ─────────────────────────────────────────────────────
router.patch('/:sessionId/reschedule',
  restrictTo('instructor', 'admin'),
  requireVerified,
  [...sessionIdParam, ...rescheduleSessionRules], validate,
  ctrl.rescheduleSession
);

module.exports = router;
