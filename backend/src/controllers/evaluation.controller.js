const EvaluationRecord   = require('../models/EvaluationRecord');
const GdSession          = require('../models/GdSession');
const SessionParticipant = require('../models/SessionParticipant');
const EvaluationTemplate = require('../models/EvaluationTemplate');
const User               = require('../models/User');
const Notification       = require('../models/Notification');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { success }        = require('../utils/apiResponse');
const auditService       = require('../services/audit.service');
const emailService       = require('../services/email.service');
const {
  EVALUATION_STATUS, SESSION_STATUS, PARTICIPANT_STATUS,
  AUDIT_ACTIONS, ROLES, NOTIFICATION_TYPES,
} = require('../config/constants');

// ── Helper: assert instructor access ──────────────────────────────────────────
const assertInstructorAccess = (session, user) => {
  const isAdmin = user.role === 'admin';
  if (isAdmin) return; // admins always have access
  const owns = String(session.instructorId) === String(user._id);
  const co   = session.coInstructors?.some((id) => String(id) === String(user._id));
  if (!owns && !co) throw new AppError('You do not have access to this session.', 403);
};

const scopedInstructorFilter = (session, user) => (
  user.role === ROLES.ADMIN ? {} : { instructorId: user._id }
);

const evaluationOwnerId = (session, user) => (
  user.role === ROLES.ADMIN ? session.instructorId : user._id
);

// ── GET /api/sessions/:sessionId/evaluations ──────────────────────────────────
// Returns ALL evaluation records for this session × instructor (preload pattern)
exports.getSessionEvaluations = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  const records = await EvaluationRecord
    .find({ sessionId: session._id, ...scopedInstructorFilter(session, req.user) })
    .populate('studentId', 'name email avatar')
    .lean();

  // Return as a map keyed by studentId for O(1) lookups on the frontend
  const byStudentId = records.reduce((acc, r) => {
    acc[String(r.studentId._id || r.studentId)] = r;
    return acc;
  }, {});

  success(res, { evaluations: records, byStudentId, total: records.length });
});

// ── PATCH /api/evaluations/batch ──────────────────────────────────────────────
/**
 * This is the ONLY endpoint that writes evaluation data to MongoDB.
 * The socket layer only broadcasts — it never writes to DB.
 *
 * Body: {
 *   sessionId: string,
 *   updates: [{
 *     studentId: string,
 *     fieldValues: [{ fieldId, value, scoredAt, deviceLabel }],
 *     overallComment?: string,
 *   }]
 * }
 */
exports.batchUpdateEvaluations = asyncHandler(async (req, res, next) => {
  const { sessionId, updates } = req.body;

  const session = await GdSession.findById(sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  if (session.status !== SESSION_STATUS.ACTIVE && session.status !== SESSION_STATUS.COMPLETED) {
    return next(new AppError('Evaluations can only be edited during an active or completed session.', 400));
  }

  const results = { updated: 0, created: 0, errors: [] };

  // Process each student update
  await Promise.all(
    updates.map(async ({ studentId, fieldValues = [], overallComment }) => {
      try {
        const ownerId = evaluationOwnerId(session, req.user);
        let record = await EvaluationRecord.findOne({
          sessionId,
          studentId,
          instructorId: ownerId,
        });

        if (!record) {
          // Create draft if it doesn't exist yet
          record = new EvaluationRecord({
            sessionId,
            studentId,
            instructorId:    ownerId,
            templateId:      session.templateId,
            templateVersion: session.templateVersion,
            status:          EVALUATION_STATUS.DRAFT,
          });
          results.created++;
        } else if (record.status === EVALUATION_STATUS.PUBLISHED) {
          results.errors.push({ studentId, error: 'Cannot modify a published evaluation.' });
          return;
        }

        // Apply LWW for each field
        fieldValues.forEach((fv) => record.applyFieldUpdate(fv));

        if (overallComment !== undefined) {
          record.overallComment = overallComment;
          record.lastUpdatedAt  = new Date();
        }

        record.version += 1;
        await record.save();
        results.updated++;
      } catch (err) {
        results.errors.push({ studentId, error: err.message });
      }
    })
  );

  auditService.fromReq(req, {
    action:   AUDIT_ACTIONS.EVAL_BATCH_SAVE,
    resource: 'EvaluationRecord',
    metadata: { sessionId, count: updates.length },
  });

  success(res, results, `Batch save: ${results.updated} updated, ${results.created} created`);
});

// ── PATCH /api/sessions/:sessionId/evaluations/:studentId/submit ──────────────
exports.submitEvaluation = asyncHandler(async (req, res, next) => {
  const { sessionId, studentId } = req.params;

  const session = await GdSession.findById(sessionId)
    .populate('templateId');
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  const record = await EvaluationRecord.findOne({
    sessionId,
    studentId,
    ...scopedInstructorFilter(session, req.user),
  });
  if (!record) return next(new AppError('Evaluation record not found.', 404));
  if (record.status === EVALUATION_STATUS.PUBLISHED) {
    return next(new AppError('Cannot modify a published evaluation.', 400));
  }

  // Compute score before submitting
  const template = session.templateId;
  record.computeScore(template.fields);
  record.status      = EVALUATION_STATUS.SUBMITTED;
  record.submittedAt = new Date();
  await record.save();

  // Update session evaluated count
  const uniqueEvaluated = await EvaluationRecord.distinct('studentId', {
    sessionId,
    status: { $in: [EVALUATION_STATUS.SUBMITTED, EVALUATION_STATUS.PUBLISHED] },
  });
  await GdSession.findByIdAndUpdate(sessionId, { evaluatedCount: uniqueEvaluated.length });

  auditService.fromReq(req, {
    action:     AUDIT_ACTIONS.EVAL_SUBMIT,
    resource:   'EvaluationRecord',
    resourceId: record._id,
    metadata:   { studentId, totalScore: record.totalScore },
  });

  success(res, { record }, 'Evaluation submitted');
});

// ── POST /api/sessions/:sessionId/evaluations/publish ─────────────────────────
exports.publishEvaluations = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;
  // Optionally publish only specific students; if empty, publish all submitted
  const { studentIds } = req.body;

  const session = await GdSession.findById(sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  // 1. Get all participants for this session
  const participants = await SessionParticipant.find({ sessionId });
  const participantStudentIds = participants.map((p) => String(p.studentId));

  // 2. Ensure each participant has an EvaluationRecord (even if it's empty / draft)
  const template = await EvaluationTemplate.findById(session.templateId);
  if (!template) return next(new AppError('Evaluation template not found.', 404));

  for (const studentId of participantStudentIds) {
    const ownerId = evaluationOwnerId(session, req.user);
    let record = await EvaluationRecord.findOne({
      sessionId,
      studentId,
      instructorId: ownerId,
    });
    if (!record) {
      record = new EvaluationRecord({
        sessionId,
        studentId,
        instructorId:    ownerId,
        templateId:      session.templateId,
        templateVersion: session.templateVersion,
        status:          EVALUATION_STATUS.DRAFT,
      });
      await record.save();
    }
  }

  // 3. Find records to publish
  const filter = {
    sessionId,
    ...scopedInstructorFilter(session, req.user),
    status:       { $in: [EVALUATION_STATUS.DRAFT, EVALUATION_STATUS.SUBMITTED] },
  };
  if (studentIds?.length) filter.studentId = { $in: studentIds };

  const records = await EvaluationRecord.find(filter);
  if (!records.length) {
    return next(new AppError('No evaluations found to publish.', 404));
  }

  const now = new Date();
  for (const record of records) {
    if (record.status === EVALUATION_STATUS.DRAFT) {
      record.computeScore(template.fields);
      record.submittedAt = now;
    }
    record.status = EVALUATION_STATUS.PUBLISHED;
    record.publishedAt = now;
    await record.save();
  }

  // Update session evaluated count
  const uniqueEvaluated = await EvaluationRecord.distinct('studentId', {
    sessionId,
    status: { $in: [EVALUATION_STATUS.SUBMITTED, EVALUATION_STATUS.PUBLISHED] },
  });
  await GdSession.findByIdAndUpdate(sessionId, { evaluatedCount: uniqueEvaluated.length });

  // Notify students and send emails (non-blocking)
  const studentIdsPublished = records.map((r) => r.studentId);
  const students = await User.find({ _id: { $in: studentIdsPublished } });

  const notifications = students.map((student) => ({
    userId:  student._id,
    type:    NOTIFICATION_TYPES.RESULTS_PUBLISHED,
    title:   'Your GD results are ready',
    message: `Your evaluation for "${session.title}" has been published.`,
    data:    { sessionId: session._id, sessionTitle: session.title },
  }));
  await Notification.insertMany(notifications);

  students.forEach((student) => {
    emailService.sendResultsPublished(student, session).catch(() => {});
  });

  auditService.fromReq(req, {
    action:   AUDIT_ACTIONS.EVAL_PUBLISH,
    resource: 'GdSession',
    resourceId: session._id,
    metadata: { publishedCount: records.length },
  });

  success(res, { publishedCount: records.length }, 'Evaluations published successfully');
});

// ── GET /api/sessions/:sessionId/results ──────────────────────────────────────
// Student-facing: returns only published evaluations for that student
exports.getPublishedResults = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const session = await GdSession.findById(sessionId);
  if (!session) return next(new AppError('Session not found.', 404));

  // If instructor, assert they have access to this session
  if (req.user.role === ROLES.INSTRUCTOR) {
    assertInstructorAccess(session, req.user);
  }

  const filter = { sessionId, status: EVALUATION_STATUS.PUBLISHED };

  // Students can only see their own results
  if (req.user.role === ROLES.STUDENT) {
    filter.studentId = req.user._id;
  }

  const records = await EvaluationRecord
    .find(filter)
    .populate('instructorId', 'name')
    .populate('studentId', 'name email')
    .populate({
      path:   'templateId',
      select: 'fields name maxPossibleScore',
    })
    .lean();



  success(res, { results: records, total: records.length });
});

// ── GET /api/sessions/:sessionId/evaluations/:studentId ───────────────────────
// Instructor: fetch single student's evaluation record
exports.getEvaluationRecord = asyncHandler(async (req, res, next) => {
  const { sessionId, studentId } = req.params;

  const session = await GdSession.findById(sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  let record = await EvaluationRecord.findOne({
    sessionId,
    studentId,
    ...scopedInstructorFilter(session, req.user),
  }).populate('studentId', 'name email avatar');

  if (!record) {
    // Auto-create an empty draft if one doesn't exist
    record = await EvaluationRecord.create({
      sessionId,
      studentId,
      instructorId:    evaluationOwnerId(session, req.user),
      templateId:      session.templateId,
      templateVersion: session.templateVersion,
      status:          EVALUATION_STATUS.DRAFT,
    });
  }

  success(res, { record });
});
