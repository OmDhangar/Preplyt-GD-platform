const User              = require('../models/User');
const InstructorProfile = require('../models/InstructorProfile');
const StudentProfile    = require('../models/StudentProfile');
const asyncHandler      = require('../utils/asyncHandler');
const AppError          = require('../utils/AppError');
const { success }       = require('../utils/apiResponse');
const { ROLES, INSTRUCTOR_VERIFICATION_STATUS, AUDIT_ACTIONS } = require('../config/constants');
const auditService      = require('../services/audit.service');
const emailService      = require('../services/email.service');

// ── GET /api/users/me ──────────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let profile = null;

  if (req.user.role === ROLES.INSTRUCTOR) {
    profile = await InstructorProfile.findOne({ userId: req.user._id })
      .populate('defaultTemplateId', 'name status');
  } else if (req.user.role === ROLES.STUDENT) {
    profile = await StudentProfile.findOne({ userId: req.user._id });
  }

  success(res, { user, profile });
});

// ── PATCH /api/users/me ────────────────────────────────────────────────────────
exports.updateMe = asyncHandler(async (req, res, next) => {
  // Disallow password/role changes through this endpoint
  const { password, role, isActive, ...allowed } = req.body;
  if (password || role) {
    return next(new AppError('Use /auth/reset-password to change password. Role cannot be changed.', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name: allowed.name, avatar: allowed.avatar } },
    { new: true, runValidators: true }
  );
  success(res, { user }, 'Profile updated');
});

// ── GET /api/users/me/profile ──────────────────────────────────────────────────
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  let profile;
  if (req.user.role === ROLES.INSTRUCTOR) {
    profile = await InstructorProfile.findOne({ userId: req.user._id });
  } else {
    profile = await StudentProfile.findOne({ userId: req.user._id });
  }
  if (!profile) return next(new AppError('Profile not found.', 404));
  success(res, { profile });
});

// ── PATCH /api/users/me/profile ────────────────────────────────────────────────
exports.updateMyProfile = asyncHandler(async (req, res, next) => {
  let profile;

  if (req.user.role === ROLES.INSTRUCTOR) {
    const allowed = (({ organization, designation, specializations, bio, defaultTemplateId }) =>
      ({ organization, designation, specializations, bio, defaultTemplateId }))(req.body);

    profile = await InstructorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: allowed },
      { new: true, runValidators: true }
    );
  } else if (req.user.role === ROLES.STUDENT) {
    const allowed = (({ rollNumber, batch, program, institution, phone }) =>
      ({ rollNumber, batch, program, institution, phone }))(req.body);

    profile = await StudentProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: allowed },
      { new: true, runValidators: true }
    );
  } else {
    return next(new AppError('Profile management not available for this role.', 400));
  }

  if (!profile) return next(new AppError('Profile not found.', 404));
  success(res, { profile }, 'Profile updated');
});

// ── Admin: GET /api/users — list all users ─────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;

  const skip  = (page - 1) * limit;
  const total = await User.countDocuments(filter);
  const users = await User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });

  success(res, { users, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ── Admin: PATCH /api/users/:id/status ────────────────────────────────────────
exports.setUserActive = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: req.body.isActive } },
    { new: true }
  );
  if (!user) return next(new AppError('User not found.', 404));
  success(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
});

// ══════════════════════════════════════════════════════════════════════════════
//  INSTRUCTOR VERIFICATION ENDPOINTS (Admin only)
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/users/instructors/pending ─────────────────────────────────────────
exports.getPendingInstructors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    role: ROLES.INSTRUCTOR,
    verificationStatus: INSTRUCTOR_VERIFICATION_STATUS.PENDING,
  };

  const total = await User.countDocuments(filter);
  const instructors = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  // Fetch profiles for extra context
  const userIds = instructors.map((u) => u._id);
  const profiles = await InstructorProfile.find({ userId: { $in: userIds } });
  const profileMap = profiles.reduce((m, p) => { m[String(p.userId)] = p; return m; }, {});

  const data = instructors.map((u) => ({
    user: u,
    profile: profileMap[String(u._id)] || null,
  }));

  success(res, { instructors: data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ── PATCH /api/users/:id/verify — approve instructor ─────────────────────────
exports.verifyInstructor = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));
  if (user.role !== ROLES.INSTRUCTOR) {
    return next(new AppError('Only instructor accounts can be verified.', 400));
  }
  if (user.verificationStatus === INSTRUCTOR_VERIFICATION_STATUS.APPROVED) {
    return next(new AppError('This instructor is already verified.', 400));
  }

  user.isVerified         = true;
  user.verificationStatus = INSTRUCTOR_VERIFICATION_STATUS.APPROVED;
  user.verifiedAt         = new Date();
  user.verifiedBy         = req.user._id;
  user.rejectionReason    = '';
  await user.save({ validateBeforeSave: false });

  // Send approval email
  emailService.sendInstructorVerified(user).catch(() => {});

  auditService.fromReq(req, {
    action:     AUDIT_ACTIONS.INSTRUCTOR_VERIFY,
    resource:   'User',
    resourceId: user._id,
  });

  success(res, { user }, 'Instructor verified successfully');
});

// ── PATCH /api/users/:id/reject — reject instructor ──────────────────────────
exports.rejectInstructor = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));
  if (user.role !== ROLES.INSTRUCTOR) {
    return next(new AppError('Only instructor accounts can be rejected.', 400));
  }
  if (user.verificationStatus === INSTRUCTOR_VERIFICATION_STATUS.REJECTED) {
    return next(new AppError('This instructor is already rejected.', 400));
  }

  const reason = req.body.reason || '';

  user.isVerified         = false;
  user.verificationStatus = INSTRUCTOR_VERIFICATION_STATUS.REJECTED;
  user.rejectionReason    = reason;
  user.verifiedAt         = new Date();
  user.verifiedBy         = req.user._id;
  await user.save({ validateBeforeSave: false });

  // Send rejection email
  emailService.sendInstructorRejected(user, reason).catch(() => {});

  auditService.fromReq(req, {
    action:     AUDIT_ACTIONS.INSTRUCTOR_REJECT,
    resource:   'User',
    resourceId: user._id,
    metadata:   { reason },
  });

  success(res, { user }, 'Instructor rejected');
});

// ── Admin: PATCH /api/users/:id/blacklist ────────────────────────────────────
exports.toggleUserBlacklist = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  if (String(user._id) === String(req.user._id)) {
    return next(new AppError('You cannot blacklist your own account.', 400));
  }

  user.isBlacklisted = !user.isBlacklisted;
  if (user.isBlacklisted) {
    user.refreshTokens = []; // Clear refresh tokens to force immediate logout
  }
  await user.save({ validateBeforeSave: false });

  auditService.fromReq(req, {
    action:     user.isBlacklisted ? 'USER_BLACKLIST' : 'USER_UNBLACKLIST',
    resource:   'User',
    resourceId: user._id,
  });

  success(res, { user }, `User ${user.isBlacklisted ? 'blacklisted' : 'unblacklisted'} successfully`);
});

// ── Admin: DELETE /api/users/:id ─────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  if (String(user._id) === String(req.user._id)) {
    return next(new AppError('You cannot delete your own account.', 400));
  }

  // Delete profiles
  await InstructorProfile.deleteOne({ userId: user._id });
  await StudentProfile.deleteOne({ userId: user._id });

  // Delete User doc
  await user.deleteOne();

  auditService.fromReq(req, {
    action:     'USER_DELETE',
    resource:   'User',
    resourceId: user._id,
  });

  success(res, null, 'User and associated profile deleted successfully');
});
