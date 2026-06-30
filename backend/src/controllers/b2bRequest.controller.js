const B2bRequest = require('../models/B2bRequest');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { success, created, paginated } = require('../utils/apiResponse');
const emailService = require('../services/email.service');
const logger = require('../config/logger');

// ── POST /api/b2b-requests (Public) ──────────────────────────────────────────
exports.createRequest = asyncHandler(async (req, res, next) => {
  const { name, designation, college, city, students, phone, email } = req.body;

  if (!name || !designation || !college || !city || !students || !phone || !email) {
    return next(new AppError('All fields are required.', 400));
  }

  const b2bRequest = await B2bRequest.create({
    name,
    designation,
    college,
    city,
    students,
    phone,
    email,
  });

  // Trigger emails in the background
  emailService.sendB2bAdminNotification(b2bRequest).catch((err) => {
    logger.error(`[B2B Email Error] Failed to notify admin: ${err.message}`);
  });

  emailService.sendB2bThankYou(b2bRequest).catch((err) => {
    logger.error(`[B2B Email Error] Failed to send thank you to client: ${err.message}`);
  });

  created(res, { b2bRequest }, 'Your pilot session request has been submitted successfully.');
});

// ── GET /api/b2b-requests (Admin Only) ─────────────────────────────────────────
exports.getAllRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const total = await B2bRequest.countDocuments(filter);
  const requests = await B2bRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  paginated(res, requests, page, limit, total, 'B2B Requests retrieved successfully.');
});

// ── PATCH /api/b2b-requests/:id (Admin Only) ──────────────────────────────────
exports.updateRequestStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!status || !['pending', 'reviewed', 'contacted'].includes(status)) {
    return next(new AppError('Please provide a valid status: pending, reviewed, or contacted.', 400));
  }

  const b2bRequest = await B2bRequest.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!b2bRequest) {
    return next(new AppError('B2B request not found.', 404));
  }

  success(res, { b2bRequest }, `B2B Request status updated to ${status}.`);
});
