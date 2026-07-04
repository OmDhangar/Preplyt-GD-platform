const GdSession          = require('../models/GdSession');
const SessionParticipant = require('../models/SessionParticipant');
const SessionFeedback    = require('../models/SessionFeedback');
const User               = require('../models/User');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { success, created } = require('../utils/apiResponse');
const { SESSION_STATUS, PARTICIPANT_STATUS, ROLES } = require('../config/constants');
const mongoose = require('mongoose');

// ── Submit Feedback (Student) ────────────────────────────────────────────────
exports.submitFeedback = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;
  const { rating, comment } = req.body;

  const session = await GdSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found.', 404));
  }

  // Verify session is completed or published
  if (session.status !== SESSION_STATUS.COMPLETED && session.status !== SESSION_STATUS.PUBLISHED) {
    return next(new AppError('Feedback can only be submitted for completed or published sessions.', 400));
  }

  // Verify student was registered/attended
  const participant = await SessionParticipant.findOne({
    sessionId,
    studentId: req.user._id,
    status: { $in: [PARTICIPANT_STATUS.REGISTERED, PARTICIPANT_STATUS.ATTENDED] },
  });

  if (!participant) {
    return next(new AppError('You must be a registered participant of this session to submit feedback.', 403));
  }

  try {
    const feedback = await SessionFeedback.create({
      sessionId,
      studentId: req.user._id,
      rating: Number(rating),
      comment: comment || '',
    });

    created(res, { feedback }, 'Feedback submitted successfully');
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('You have already submitted feedback for this session.', 409));
    }
    throw err;
  }
});

// ── Get Feedback for a Session ────────────────────────────────────────────────
exports.getSessionFeedback = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const session = await GdSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found.', 404));
  }

  let feedbacks;
  if (req.user.role === ROLES.STUDENT) {
    // Student can only see their own feedback
    feedbacks = await SessionFeedback.find({ sessionId, studentId: req.user._id })
      .populate('studentId', 'name email');
  } else {
    // Instructor/Admin can see all feedbacks
    feedbacks = await SessionFeedback.find({ sessionId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });
  }

  success(res, { feedbacks });
});

// ── Get Admin Feedback Analytics ──────────────────────────────────────────────
exports.getAdminFeedbackAnalytics = asyncHandler(async (req, res, next) => {
  // Aggregate feedback per session
  const sessionStats = await SessionFeedback.aggregate([
    {
      $group: {
        _id: '$sessionId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        comments: {
          $push: {
            $cond: {
              if: { $ne: [{ $trim: { input: '$comment' } }, ''] },
              then: {
                comment: '$comment',
                rating: '$rating',
                studentId: '$studentId',
                createdAt: '$createdAt',
              },
              else: '$$REMOVE',
            },
          },
        },
      },
    },
    // Populate session info
    {
      $lookup: {
        from: 'gdsessions',
        localField: '_id',
        foreignField: '_id',
        as: 'session',
      },
    },
    { $unwind: '$session' },
    // Populate conductor / instructor
    {
      $lookup: {
        from: 'users',
        localField: 'session.instructorId',
        foreignField: '_id',
        as: 'instructor',
      },
    },
    { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },
    // Project final structure
    {
      $project: {
        _id: 1,
        averageRating: { $round: ['$averageRating', 1] },
        totalReviews: 1,
        comments: 1,
        'session.title': 1,
        'session.sessionType': 1,
        'session.scheduledAt': 1,
        'instructor.name': 1,
        'instructor.email': 1,
      },
    },
    { $sort: { 'session.scheduledAt': -1 } },
  ]);

  // Populate student details inside the comments list for all aggregated sessionStats
  // Since studentId is inside comments, we can do it manually in Javascript to be simple and robust
  for (const stat of sessionStats) {
    if (stat.comments && stat.comments.length > 0) {
      for (const item of stat.comments) {
        if (item.studentId) {
          const student = await User.findById(item.studentId).select('name email');
          if (student) {
            item.student = student;
          }
        }
      }
    }
  }

  // Calculate high level KPIs
  const totalReviews = await SessionFeedback.countDocuments({});
  const ratingSum = await SessionFeedback.aggregate([
    { $group: { _id: null, overallAvg: { $avg: '$rating' } } },
  ]);
  const overallAvg = ratingSum.length > 0 ? Math.round(ratingSum[0].overallAvg * 10) / 10 : 0;

  // Breakdown by session types
  const typeBreakdown = await SessionFeedback.aggregate([
    {
      $lookup: {
        from: 'gdsessions',
        localField: 'sessionId',
        foreignField: '_id',
        as: 'session',
      },
    },
    { $unwind: '$session' },
    {
      $group: {
        _id: '$session.sessionType',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        sessionType: '$_id',
        avgRating: { $round: ['$avgRating', 1] },
        count: 1,
      },
    },
  ]);

  success(res, {
    totalReviews,
    overallAvg,
    typeBreakdown,
    sessions: sessionStats,
  });
});
