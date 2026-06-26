const GdSession          = require('../models/GdSession');
const SessionParticipant = require('../models/SessionParticipant');
const EvaluationRecord   = require('../models/EvaluationRecord');
const EvaluationTemplate = require('../models/EvaluationTemplate');
const Payment            = require('../models/Payment');
const Notification       = require('../models/Notification');
const asyncHandler       = require('../utils/asyncHandler');
const { success }        = require('../utils/apiResponse');
const { SESSION_STATUS, EVALUATION_STATUS, PAYMENT_STATUS } = require('../config/constants');

// ── GET /api/dashboard/instructor ─────────────────────────────────────────────
exports.getInstructorDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const sessionFilter = {
    $or: [{ instructorId: userId }, { coInstructors: userId }],
  };

  // Parallel queries for performance
  const [
    totalSessions,
    activeSessions,
    completedSessions,
    recentSessions,
    totalTemplates,
    publishedTemplates,
    unreadNotifications,
  ] = await Promise.all([
    GdSession.countDocuments(sessionFilter),
    GdSession.countDocuments({ ...sessionFilter, status: SESSION_STATUS.ACTIVE }),
    GdSession.countDocuments({ ...sessionFilter, status: SESSION_STATUS.COMPLETED }),
    // Recent 5 sessions with template info
    GdSession.find(sessionFilter)
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('templateId', 'name')
      .lean(),
    EvaluationTemplate.countDocuments({ createdBy: userId, isArchived: false }),
    EvaluationTemplate.countDocuments({ createdBy: userId, status: 'active', isArchived: false }),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  const recent = await Promise.all(recentSessions.map(async (s) => {
    const evals = await EvaluationRecord.find({ sessionId: s._id, status: EVALUATION_STATUS.PUBLISHED });
    const avgScore = evals.length
      ? Math.round(evals.reduce((sum, e) => sum + (e.percentScore || 0), 0) / evals.length)
      : null;
    return {
      _id: s._id,
      title: s.title,
      status: s.status,
      endedAt: s.endedAt,
      avgScore,
    };
  }));

  // Sessions scheduled in the next 7 days
  const upcomingSessions = await GdSession
    .find({
      ...sessionFilter,
      status:      SESSION_STATUS.SCHEDULED,
      scheduledAt: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })
    .sort({ scheduledAt: 1 })
    .limit(5)
    .populate('templateId', 'name');

  const upcoming = upcomingSessions.map((s) => ({
    _id: s._id,
    title: s.title,
    scheduledAt: s.scheduledAt,
  }));

  // Group sessions by month for the chart (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const chartData = await GdSession.aggregate([
    {
      $match: {
        ...sessionFilter,
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chart = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-based
    const match = chartData.find(c => c._id.year === year && c._id.month === month);
    chart.push({
      label: monthNames[month - 1],
      sessions: match ? match.count : 0
    });
  }

  const User = require('../models/User');
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
  let googleConnected = false;
  if (adminEmail) {
    const adminUser = await User.findOne({ email: adminEmail.toLowerCase() }).select('+googleTokens.refreshToken');
    googleConnected = !!(adminUser && adminUser.googleTokens && adminUser.googleTokens.refreshToken);
  }

  success(res, {
    sessions: {
      active: activeSessions,
      completed: completedSessions,
      draft: totalSessions - activeSessions - completedSessions,
      total: totalSessions,
    },
    templates: {
      total: totalTemplates,
      published: publishedTemplates,
    },
    unreadNotifications,
    googleConnected,
    recent,
    upcoming,
    chart,
    stats: {
      totalSessions,
      activeSessions,
      completedSessions,
      draftSessions: totalSessions - activeSessions - completedSessions,
      totalTemplates,
      unreadNotifications,
    },
  });
});

// ── GET /api/dashboard/student ────────────────────────────────────────────────
exports.getStudentDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    participations,
    unreadNotifications,
    paymentHistory,
  ] = await Promise.all([
    // All sessions the student is enrolled in
    SessionParticipant
      .find({ studentId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path:   'sessionId',
        select: 'title status scheduledAt instructorId requiresPayment',
        populate: { path: 'instructorId', select: 'name' },
      })
      .lean(),
    Notification.countDocuments({ userId, isRead: false }),
    Payment.find({ userId, status: PAYMENT_STATUS.PAID })
      .sort({ paidAt: -1 })
      .limit(5)
      .populate('sessionId', 'title scheduledAt')
      .lean(),
  ]);

  // Fetch published results for the student
  const publishedResults = await EvaluationRecord
    .find({ studentId: userId, status: EVALUATION_STATUS.PUBLISHED })
    .populate('sessionId', 'title scheduledAt')
    .populate('instructorId', 'name')
    .select('sessionId totalScore maxScore percentScore publishedAt')
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();

  // Average score across all published results
  const avgScoreStr = publishedResults.length
    ? (publishedResults.reduce((s, r) => s + (r.percentScore || 0), 0) / publishedResults.length).toFixed(1)
    : '0';

  const assigned = participations.map((p) => ({
    _id: p.sessionId?._id || p.sessionId,
    title: p.sessionId?.title || 'Unknown Session',
    status: p.status,
    paymentStatus: p.paymentId?.status || (p.isPaid ? 'paid' : (p.sessionId?.requiresPayment ? 'pending' : 'paid')),
    scheduledAt: p.sessionId?.scheduledAt,
  }));

  const results = publishedResults.map((r) => ({
    sessionId: r.sessionId?._id || r.sessionId,
    title: r.sessionId?.title || 'Unknown Session',
    percentScore: r.percentScore,
  }));

  success(res, {
    assigned,
    results,
    avgScore: Number(avgScoreStr),
    unreadNotifications,
    stats: {
      totalInvitations: participations.length,
      unreadNotifications,
      publishedResultsCount: publishedResults.length,
      avgScore: Number(avgScoreStr),
    },
  });
});

// ── GET /api/dashboard/session/:sessionId ─────────────────────────────────────
// Live session evaluation board — used during an active GD
exports.getSessionBoard = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const session = await GdSession
    .findById(sessionId)
    .populate('templateId')
    .lean();

  if (!session) {
    const AppError = require('../utils/AppError');
    return next(new AppError('Session not found.', 404));
  }

  // All participants with their evaluation status for this instructor
  const participants = await SessionParticipant
    .find({ sessionId })
    .populate('studentId', 'name email avatar')
    .lean();

  const evalRecords = await EvaluationRecord
    .find({ sessionId, instructorId: req.user._id })
    .select('studentId status totalScore percentScore fieldValues lastUpdatedAt version')
    .lean();

  const evalMap = evalRecords.reduce((acc, r) => {
    acc[String(r.studentId)] = r;
    return acc;
  }, {});

  const board = participants.map((p) => ({
    participant: p,
    evaluation:  evalMap[String(p.studentId?._id || p.studentId)] || null,
  }));

  // Per-field aggregate stats (useful for live instructor view)
  const fieldStats = session.templateId?.fields?.map((field) => {
    const values = evalRecords
      .flatMap((r) => r.fieldValues)
      .filter((fv) => fv.fieldId === field.fieldId && fv.value != null)
      .map((fv) => Number(fv.value))
      .filter((v) => !isNaN(v));

    const avg = values.length
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
      : null;

    return { fieldId: field.fieldId, label: field.label, avgScore: avg, scoredCount: values.length };
  }) || [];

  success(res, {
    session,
    board,
    fieldStats,
    summary: {
      total:     participants.length,
      evaluated: evalRecords.filter((r) => r.status !== 'draft').length,
      published: evalRecords.filter((r) => r.status === 'published').length,
    },
  });
});
