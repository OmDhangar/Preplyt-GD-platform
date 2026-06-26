const AppError = require('../utils/AppError');

/**
 * Factory that returns a middleware checking if req.user.role
 * is in the allowed roles list.
 *
 * Usage: router.get('/admin-only', protect, restrictTo('admin'), handler)
 */
const restrictTo = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in.', 401));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new AppError(
        `Access denied. This route is restricted to: ${allowedRoles.join(', ')}.`,
        403
      )
    );
  }
  next();
};

/**
 * Checks that req.user is the owner of a resource OR is an admin.
 * `getOwnerId` is a function that receives req and returns the owner's user id.
 *
 * Usage:
 *   router.delete('/:id', protect, ownerOrAdmin((req) => myDoc.userId), handler)
 */
const ownerOrAdmin = (getOwnerId) => (req, res, next) => {
  const ownerId = getOwnerId(req);
  if (!ownerId) return next(new AppError('Resource owner could not be determined.', 500));

  if (req.user.role === 'admin' || String(ownerId) === String(req.user._id)) {
    return next();
  }
  next(new AppError('You do not have permission to perform this action.', 403));
};

module.exports = { restrictTo, ownerOrAdmin };
