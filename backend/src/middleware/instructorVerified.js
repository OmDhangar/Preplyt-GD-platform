const AppError = require('../utils/AppError');
const { ROLES } = require('../config/constants');

/**
 * Middleware: ensures that instructor-role users have been verified by an admin
 * before they can access protected functionality (create sessions, evaluate, etc.).
 *
 * Students and admins pass through automatically.
 *
 * Usage: router.post('/sessions', protect, requireVerified, handler)
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in.', 401));
  }

  // Only instructors need verification — students & admins skip this check
  if (req.user.role !== ROLES.INSTRUCTOR) {
    return next();
  }

  if (req.user.isVerified === true) {
    return next();
  }

  // Provide a descriptive message based on status
  const status = req.user.verificationStatus || 'pending';
  if (status === 'rejected') {
    return next(
      new AppError(
        'Your instructor account has been rejected by the admin. Please contact support for more information.',
        403
      )
    );
  }

  return next(
    new AppError(
      'Your instructor account is pending admin verification. You will be notified once your account is approved.',
      403
    )
  );
};

module.exports = { requireVerified };
