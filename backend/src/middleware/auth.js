const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the JWT in the Authorization header and attaches req.user.
 * All protected routes use this middleware first.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Accept Bearer token from Authorization header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Access denied. No token provided.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // Verify the user still exists and is active
  const user = await User.findById(decoded.id).select('+isActive');
  if (!user || !user.isActive) {
    return next(new AppError('User no longer exists or has been deactivated.', 401));
  }

  // Attach full user object to request
  req.user = user;
  next();
});

/**
 * Optional auth — attaches req.user if token is present but does NOT block
 * the request if token is absent.  Useful for public endpoints that show
 * extra data when logged in.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (user?.isActive) req.user = user;
  } catch {
    // Silently ignore invalid/expired token for optional auth
  }
  next();
});

module.exports = { protect, optionalAuth };
