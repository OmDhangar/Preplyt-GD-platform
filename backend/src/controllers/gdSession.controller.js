const GdSession = require('../models/GdSession');
const SessionParticipant = require('../models/SessionParticipant');
const EvaluationRecord = require('../models/EvaluationRecord');
const EvaluationTemplate = require('../models/EvaluationTemplate');
const InstructorProfile = require('../models/InstructorProfile');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { success, created, paginated } = require('../utils/apiResponse');
const auditService = require('../services/audit.service');
const emailService = require('../services/email.service');
const { SESSION_STATUS, PARTICIPANT_STATUS, EVALUATION_STATUS, AUDIT_ACTIONS, ROLES } = require('../config/constants');

// ── Helper: verify instructor owns/co-owns session ────────────────────────────
const assertInstructorAccess = (session, user) => {
  if (user.role === ROLES.ADMIN) return;

  const userId = user._id;
  // Handle both populated objects and raw ObjectIds
  const instructorId = session.instructorId?._id || session.instructorId;
  const owns = String(instructorId) === String(userId);
  const co = session.coInstructors?.some((id) => {
    const coId = id?._id || id;
    return String(coId) === String(userId);
  });
  if (!owns && !co) throw new AppError('You do not have access to this session.', 403);
};

// ── POST /api/sessions ────────────────────────────────────────────────────────
exports.createSession = asyncHandler(async (req, res, next) => {
  const template = await EvaluationTemplate.findById(req.body.templateId);
  if (!template || template.status === 'archived') {
    return next(new AppError('Template not found or archived.', 404));
  }

  // Determine the instructor: admin can assign any verified instructor
  let assignedInstructorId = req.user._id;

  if (req.user.role === ROLES.ADMIN && req.body.instructorId) {
    const instructor = await User.findById(req.body.instructorId);
    if (!instructor) {
      return next(new AppError('Assigned instructor not found.', 404));
    }
    if (instructor.role !== ROLES.INSTRUCTOR) {
      return next(new AppError('Assigned user is not an instructor.', 400));
    }
    if (!instructor.isVerified) {
      return next(new AppError('Cannot assign an unverified instructor to a session.', 400));
    }
    assignedInstructorId = instructor._id;
  }

  let googleMeetUrl = undefined;
  if (req.body.autoCreateMeet === true || req.body.autoCreateMeet === 'true') {
    const { createMeetRoom } = require('../utils/googleCalendar');
    const tempSession = {
      title: req.body.title,
      description: req.body.description,
      scheduledAt: req.body.scheduledAt,
      durationMins: req.body.durationMins || 60,
    };
    googleMeetUrl = await createMeetRoom(tempSession, req.user.email);
  }

  const session = await GdSession.create({
    ...req.body,
    instructorId: assignedInstructorId,
    createdBy: req.user._id,
    templateVersion: template.version,
    ...(googleMeetUrl ? { googleMeetUrl } : {}),
  });

  // Bump instructor stats
  await InstructorProfile.findOneAndUpdate(
    { userId: assignedInstructorId },
    { $inc: { 'stats.totalSessionsConducted': 1 } }
  );

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_CREATE,
    resource: 'GdSession',
    resourceId: session._id,
    metadata: req.user.role === ROLES.ADMIN && req.body.instructorId
      ? { assignedInstructorId: String(assignedInstructorId) }
      : {},
  });

  created(res, { session }, 'Session created');
});

// ── GET /api/sessions ─────────────────────────────────────────────────────────
exports.getSessions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (req.user.role === ROLES.INSTRUCTOR) {
    filter.$or = [{ instructorId: req.user._id }, { coInstructors: req.user._id }];
  } else if (req.user.role === ROLES.STUDENT) {
    const { filterType } = req.query;
    if (filterType === 'joined') {
      const participantSessions = await SessionParticipant.find({ studentId: req.user._id }).select('sessionId');
      const sessionIds = participantSessions.map(p => p.sessionId);
      filter._id = { $in: sessionIds };
    } else if (filterType === 'past') {
      const participantSessions = await SessionParticipant.find({ studentId: req.user._id }).select('sessionId');
      const sessionIds = participantSessions.map(p => p.sessionId);
      filter._id = { $in: sessionIds };
      filter.$or = [
        { status: SESSION_STATUS.COMPLETED },
        { scheduledAt: { $lt: new Date() } }
      ];
    } else {
      // Show all upcoming public sessions (scheduled in the future)
      // and exclude sessions the student has already joined to prevent duplicates
      const participantSessions = await SessionParticipant.find({ studentId: req.user._id }).select('sessionId');
      const joinedSessionIds = participantSessions.map(p => p.sessionId);
      filter._id = { $nin: joinedSessionIds };
      filter.status = SESSION_STATUS.SCHEDULED;
      filter.scheduledAt = { $gt: new Date() };
    }
  } else if (req.user.role === ROLES.ADMIN) {
    // Admin sees all — optionally filter by instructor
    if (req.query.instructorId) {
      filter.instructorId = req.query.instructorId;
    }
  }
  if (status && req.user.role !== ROLES.STUDENT) filter.status = status;

  const skip = (page - 1) * limit;
  const total = await GdSession.countDocuments(filter);
  const sessions = await GdSession
    .find(filter)
    .populate('instructorId', 'name email')
    .populate('templateId', 'name status version')
    .sort({ scheduledAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  let registeredSessionIds = new Set();
  if (req.user.role === ROLES.STUDENT) {
    const participantDocs = await SessionParticipant.find({
      studentId: req.user._id,
      status: { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.ATTENDED] }
    }).select('sessionId');
    registeredSessionIds = new Set(participantDocs.map(p => String(p.sessionId)));
  }

  const sanitizedSessions = sessions.map(session => {
    const s = session.toObject();
    if (req.user.role === ROLES.STUDENT && !registeredSessionIds.has(String(s._id))) {
      delete s.googleMeetUrl;
    }
    return s;
  });

  paginated(res, sanitizedSessions, page, limit, total);
});


// ── GET /api/sessions/public/upcoming ─────────────────────────────────────────
exports.getPublicUpcomingSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, order = 'asc' } = req.query;
  const skip = (page - 1) * limit;
  const sortOrder = order === 'desc' ? -1 : 1;

  const filter = {
    status: SESSION_STATUS.SCHEDULED,
    scheduledAt: { $gt: new Date() }
  };
  const total = await GdSession.countDocuments(filter);
  const sessions = await GdSession
    .find(filter)
    .populate('instructorId', 'name email avatar')
    .sort({ scheduledAt: sortOrder })
    .skip(skip)
    .limit(Number(limit));

  const sanitizedSessions = sessions.map(session => {
    const s = session.toObject();
    delete s.googleMeetUrl;
    return s;
  });

  paginated(res, sanitizedSessions, page, limit, total);
});

// ── GET /api/sessions/:sessionId ──────────────────────────────────────────────

exports.getSession = asyncHandler(async (req, res, next) => {
  const session = await GdSession
    .findById(req.params.sessionId)
    .populate('instructorId', 'name email avatar')
    .populate('coInstructors', 'name email')
    .populate({
      path: 'templateId',
      select: 'name description fields status version maxPossibleScore',
    });

  if (!session) return next(new AppError('Session not found.', 404));

  // Instructors see full details; students just need to confirm enrollment
  if (req.user.role === ROLES.INSTRUCTOR || req.user.role === ROLES.ADMIN) {
    assertInstructorAccess(session, req.user);
  }

  const s = session.toObject();

  if (req.user.role === ROLES.STUDENT) {
    const isSubscribed = await SessionParticipant.exists({
      sessionId: session._id,
      studentId: req.user._id,
      status: { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.ATTENDED] },
    });
    if (!isSubscribed) {
      delete s.joinCode;
      delete s.googleMeetUrl;
    }
  }

  success(res, { session: s });
});

// ── PATCH /api/sessions/:sessionId ────────────────────────────────────────────
exports.updateSession = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  // Fields that are safe to update even during an active session
  // (e.g. swapping to a new template version when adding custom eval params)
  const liveEditableFields = ['templateId', 'templateVersion'];

  const requestedKeys = Object.keys(req.body);
  const isLiveEditOnly = requestedKeys.every(k => liveEditableFields.includes(k));

  if (!session.isEditable && !isLiveEditOnly) {
    return next(new AppError('Only draft or scheduled sessions can be updated.', 400));
  }

  // Pick only whitelisted fields, then drop any that are undefined so we
  // don't overwrite existing required fields (e.g. title) with undefined.
  const allowedKeys = [
    'title', 'description', 'topic', 'scheduledAt', 'durationMins',
    'maxParticipants', 'requiresPayment', 'sessionFee', 'settings',
    'tags', 'coInstructors', 'googleMeetUrl', 'templateId', 'templateVersion',
  ];
  const updates = {};
  for (const key of allowedKeys) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  Object.assign(session, updates);
  await session.save();

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_UPDATE,
    resource: 'GdSession',
    resourceId: session._id,
  });

  success(res, { session }, 'Session updated');
});

// ── DELETE /api/sessions/:sessionId ───────────────────────────────────────────
exports.deleteSession = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  if (session.status === SESSION_STATUS.ACTIVE) {
    return next(new AppError('Cannot delete an active session. End it first.', 400));
  }

  await session.deleteOne();
  await SessionParticipant.deleteMany({ sessionId: session._id });

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_DELETE,
    resource: 'GdSession',
    resourceId: session._id,
  });

  success(res, null, 'Session deleted');
});

// ── POST /api/sessions/:sessionId/start ──────────────────────────────────────
exports.startSession = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  if (session.status === SESSION_STATUS.ACTIVE) {
    return next(new AppError('Session is already active.', 400));
  }
  if (session.status === SESSION_STATUS.COMPLETED || session.status === SESSION_STATUS.CANCELLED) {
    return next(new AppError('Cannot restart a completed or cancelled session.', 400));
  }

  session.status = SESSION_STATUS.ACTIVE;
  session.startedAt = new Date();
  await session.save();

  // Pre-create draft EvaluationRecord for every registered participant
  const participants = await SessionParticipant.find({
    sessionId: session._id,
    status: { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.INVITED] },
  });

  const evalDocs = participants.map((p) => ({
    sessionId: session._id,
    studentId: p.studentId,
    instructorId: req.user._id,
    templateId: session.templateId,
    templateVersion: session.templateVersion,
    status: EVALUATION_STATUS.DRAFT,
  }));

  if (evalDocs.length) {
    await EvaluationRecord.insertMany(evalDocs, { ordered: false }).catch(() => {
      // Ignore duplicate-key errors — records may already exist
    });
  }

  // Emit socket event via the global io instance
  const io = req.app.get('io');
  if (io) {
    io.to(`session:${session._id}`).emit('session:started', { sessionId: session._id });
  }

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_START,
    resource: 'GdSession',
    resourceId: session._id,
  });

  success(res, { session }, 'Session started');
});

// ── POST /api/sessions/:sessionId/end ─────────────────────────────────────────
exports.endSession = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  if (session.status !== SESSION_STATUS.ACTIVE) {
    return next(new AppError('Session is not currently active.', 400));
  }

  session.status = SESSION_STATUS.COMPLETED;
  session.endedAt = new Date();
  await session.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`session:${session._id}`).emit('session:ended', { sessionId: session._id });
  }

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_END,
    resource: 'GdSession',
    resourceId: session._id,
  });

  success(res, { session }, 'Session ended');
});

// ── POST /api/sessions/:sessionId/participants ────────────────────────────────
exports.assignStudents = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  const { studentIds } = req.body;

  // Verify all student IDs are valid student-role users
  const students = await User.find({
    _id: { $in: studentIds },
    role: ROLES.STUDENT,
  });

  if (students.length !== studentIds.length) {
    return next(new AppError('One or more student IDs are invalid or not student-role users.', 400));
  }

  // Upsert participants (skip existing)
  const ops = students.map((s) => ({
    updateOne: {
      filter: { sessionId: session._id, studentId: s._id },
      update: { $setOnInsert: { sessionId: session._id, studentId: s._id, status: PARTICIPANT_STATUS.INVITED } },
      upsert: true,
    },
  }));
  await SessionParticipant.bulkWrite(ops);

  // Update participant count
  const count = await SessionParticipant.countDocuments({ sessionId: session._id });
  await GdSession.findByIdAndUpdate(session._id, { participantCount: count });

  // Update student stats
  await StudentProfile.updateMany(
    { userId: { $in: students.map((s) => s._id) } },
    { $inc: { 'stats.totalSessionsInvited': 1 } }
  );

  // Send invite emails (non-blocking)
  const instructor = await User.findById(session.instructorId);
  students.forEach((student) => {
    emailService.sendSessionInvite(student, session, instructor).catch(() => { });
  });

  success(res, { assigned: students.length }, `${students.length} students assigned`);
});

// ── GET /api/sessions/:sessionId/participants ─────────────────────────────────
exports.getParticipants = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));

  const participants = await SessionParticipant
    .find({ sessionId: session._id })
    .populate('studentId', 'name email avatar')
    .populate('paymentId', 'status amount')
    .sort({ createdAt: 1 });

  success(res, { participants, total: participants.length });
});

// ── GET /api/sessions/join/:joinCode — student self-registration ───────────────
exports.getSessionByJoinCode = asyncHandler(async (req, res, next) => {
  const session = await GdSession
    .findOne({ joinCode: req.params.joinCode.toUpperCase() })
    .populate('instructorId', 'name')
    .populate('templateId', 'name');
  if (!session) return next(new AppError('Invalid join code.', 404));

  const s = session.toObject();
  delete s.googleMeetUrl;

  success(res, { session: s });
});

// ── POST /api/sessions/:sessionId/join — student self-registration ───────────────
exports.joinSession = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId)
    .populate('instructorId', 'name email');
  if (!session) return next(new AppError('Session not found.', 404));

  if (session.requiresPayment) {
    return next(new AppError('This session requires payment. Use the payment flow to join.', 400));
  }

  // Create or update participant
  const participant = await SessionParticipant.findOneAndUpdate(
    { sessionId: session._id, studentId: req.user._id },
    {
      $set: {
        isPaid: true,
        status: PARTICIPANT_STATUS.REGISTERED,
        registeredAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Update student list in session
  await GdSession.findByIdAndUpdate(session._id, { $addToSet: { students: req.user._id } });

  // Update participant count
  const count = await SessionParticipant.countDocuments({ sessionId: session._id });
  session.participantCount = count;
  await session.save();

  // Update student stats
  await StudentProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { 'stats.totalSessionsJoined': 1 } },
    { upsert: true }
  ).catch(() => { });

  // Send GD subscription confirmation email with all details and Google Meet link
  const instructor = session.instructorId; // already populated
  emailService.sendGdSubscription(req.user, session, instructor).catch(() => { });

  success(res, { participant }, 'Joined session successfully');
});

// ── POST /api/sessions/:sessionId/google-meet ───────────────────────────────
exports.generateGoogleMeet = asyncHandler(async (req, res, next) => {
  const { createMeetRoom } = require('../utils/googleCalendar');

  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  // We add both the Admin and the Instructor as co-organizers/attendees.
  // The Admin is fetched under-the-hood by GOOGLE_ADMIN_EMAIL from .env.
  // The Instructor's email is passed from req.user.email.
  const googleMeetUrl = await createMeetRoom(session, req.user.email);

  session.googleMeetUrl = googleMeetUrl;
  await session.save();

  success(res, { session }, 'Google Meet room generated successfully');
});

// ══════════════════════════════════════════════════════════════════════════════
//  ATTACHMENTS (Feature 2)
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /api/sessions/:sessionId/attachments ─────────────────────────────────
exports.addAttachment = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  const { title, description, fileUrl, fileType, fileSize } = req.body;
  if (!title || !fileUrl) {
    return next(new AppError('Attachment title and fileUrl are required.', 400));
  }

  const attachment = {
    title,
    description: description || '',
    fileUrl,
    fileType: fileType || '',
    fileSize: fileSize || 0,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  };

  session.attachments.push(attachment);
  await session.save();

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_ATTACHMENT_ADD,
    resource: 'GdSession',
    resourceId: session._id,
    metadata: { title, fileUrl },
  });

  success(res, { attachment: session.attachments[session.attachments.length - 1] }, 'Attachment added');
});

// ── DELETE /api/sessions/:sessionId/attachments/:attachmentId ─────────────────
exports.removeAttachment = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId);
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  const attachment = session.attachments.id(req.params.attachmentId);
  if (!attachment) {
    return next(new AppError('Attachment not found.', 404));
  }

  attachment.deleteOne();
  await session.save();

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_ATTACHMENT_DEL,
    resource: 'GdSession',
    resourceId: session._id,
    metadata: { attachmentId: req.params.attachmentId },
  });

  success(res, null, 'Attachment removed');
});

// ── GET /api/sessions/:sessionId/attachments ──────────────────────────────────
exports.getAttachments = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId)
    .populate('attachments.uploadedBy', 'name email');
  if (!session) return next(new AppError('Session not found.', 404));

  // Students can only view attachments if they are subscribed/registered
  if (req.user.role === ROLES.STUDENT) {
    const isSubscribed = await SessionParticipant.exists({
      sessionId: session._id,
      studentId: req.user._id,
      status: { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.ATTENDED] },
    });
    if (!isSubscribed) {
      return next(new AppError('You must be registered for this session to view attachments.', 403));
    }
  } else if (req.user.role === ROLES.INSTRUCTOR) {
    assertInstructorAccess(session, req.user);
  }
  // Admins can always view

  success(res, { attachments: session.attachments, total: session.attachments.length });
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: INSTRUCTOR-WISE GD VIEW (Feature 4)
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/sessions/admin/by-instructor ────────────────────────────────────
// Grouped summary of all sessions per instructor
exports.getSessionsGroupedByInstructor = asyncHandler(async (req, res) => {
  const grouped = await GdSession.aggregate([
    {
      $group: {
        _id: '$instructorId',
        totalSessions: { $sum: 1 },
        draftCount: { $sum: { $cond: [{ $eq: ['$status', SESSION_STATUS.DRAFT] }, 1, 0] } },
        scheduledCount: { $sum: { $cond: [{ $eq: ['$status', SESSION_STATUS.SCHEDULED] }, 1, 0] } },
        activeCount: { $sum: { $cond: [{ $eq: ['$status', SESSION_STATUS.ACTIVE] }, 1, 0] } },
        completedCount: { $sum: { $cond: [{ $eq: ['$status', SESSION_STATUS.COMPLETED] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ['$status', SESSION_STATUS.CANCELLED] }, 1, 0] } },
        totalParticipants: { $sum: '$participantCount' },
        latestSession: { $max: '$scheduledAt' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'instructor',
        pipeline: [{ $project: { name: 1, email: 1, avatar: 1, isVerified: 1, verificationStatus: 1 } }],
      },
    },
    { $unwind: '$instructor' },
    { $sort: { totalSessions: -1 } },
  ]);

  success(res, { instructors: grouped, total: grouped.length });
});

// ── GET /api/sessions/admin/by-instructor/:instructorId ──────────────────────
// All sessions for a specific instructor
exports.getSessionsByInstructor = asyncHandler(async (req, res, next) => {
  const instructor = await User.findById(req.params.instructorId);
  if (!instructor || instructor.role !== ROLES.INSTRUCTOR) {
    return next(new AppError('Instructor not found.', 404));
  }

  const { status, page = 1, limit = 10 } = req.query;
  const filter = { instructorId: instructor._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const total = await GdSession.countDocuments(filter);
  const sessions = await GdSession
    .find(filter)
    .populate('instructorId', 'name email')
    .populate('templateId', 'name status version')
    .sort({ scheduledAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  paginated(res, sessions, page, limit, total, 'Sessions fetched');
});

// ══════════════════════════════════════════════════════════════════════════════
//  GD RESCHEDULE / POSTPONEMENT (Feature 6)
// ══════════════════════════════════════════════════════════════════════════════

// ── PATCH /api/sessions/:sessionId/reschedule ────────────────────────────────
exports.rescheduleSession = asyncHandler(async (req, res, next) => {
  const session = await GdSession.findById(req.params.sessionId)
    .populate('instructorId', 'name email');
  if (!session) return next(new AppError('Session not found.', 404));
  assertInstructorAccess(session, req.user);

  // Only scheduled sessions can be rescheduled
  if (![SESSION_STATUS.DRAFT, SESSION_STATUS.SCHEDULED].includes(session.status)) {
    return next(new AppError('Only draft or scheduled sessions can be rescheduled.', 400));
  }

  // Enforce 30-minute-before rule: can only reschedule if the current scheduled time
  // is at least 30 minutes away from now
  if (session.scheduledAt) {
    const now = new Date();
    const thirtyMinsBefore = new Date(session.scheduledAt.getTime() - 30 * 60 * 1000);
    if (now >= thirtyMinsBefore) {
      return next(
        new AppError(
          'Cannot reschedule a session less than 30 minutes before its start time.',
          400
        )
      );
    }
  }

  const { newScheduledAt, durationMins } = req.body;
  if (!newScheduledAt) {
    return next(new AppError('newScheduledAt is required for rescheduling.', 400));
  }

  const newDate = new Date(newScheduledAt);
  if (isNaN(newDate.getTime())) {
    return next(new AppError('newScheduledAt must be a valid date.', 400));
  }
  if (newDate <= new Date()) {
    return next(new AppError('New scheduled date must be in the future.', 400));
  }

  const oldDate = session.scheduledAt;

  // Update session
  session.scheduledAt = newDate;
  session.reminderSent = false; // reset so new reminder fires
  if (durationMins) session.durationMins = durationMins;
  if (session.status === SESSION_STATUS.DRAFT) session.status = SESSION_STATUS.SCHEDULED;
  await session.save();

  // Send postponement emails to all registered participants
  const participants = await SessionParticipant.find({
    sessionId: session._id,
    status: { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.INVITED] },
  }).populate('studentId', 'name email');

  const instructor = session.instructorId; // already populated
  participants.forEach((p) => {
    if (p.studentId?.email) {
      emailService
        .sendGdPostponed(p.studentId, session, instructor, oldDate, newDate)
        .catch(() => { });
    }
  });

  // Emit socket event for real-time UI updates
  const io = req.app.get('io');
  if (io) {
    io.to(`session:${session._id}`).emit('session:rescheduled', {
      sessionId: session._id,
      oldDate,
      newDate,
      durationMins: session.durationMins,
    });
  }

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.SESSION_RESCHEDULE,
    resource: 'GdSession',
    resourceId: session._id,
    metadata: { oldDate, newDate: newDate.toISOString() },
  });

  success(res, { session }, 'Session rescheduled successfully');
});
