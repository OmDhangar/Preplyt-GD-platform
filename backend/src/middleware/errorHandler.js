const logger   = require('../config/logger');
const AppError = require('../utils/AppError');

// ── Transform known Mongoose/JWT errors into AppError ─────────────────────────

const handleCastError = (err) =>
  new AppError(`Invalid value for field '${err.path}': ${err.value}`, 400);

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return new AppError(`Duplicate value '${value}' for ${field}. Please use a different value.`, 409);
};

const handleValidationError = (err) => {
  const details = Object.values(err.errors).map((e) => ({
    field:   e.path,
    message: e.message,
  }));
  return new AppError('Mongoose validation failed', 400, details);
};

const handleJWTError = () =>
  new AppError('Invalid authentication token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Authentication token expired. Please log in again.', 401);

// ── Response helpers ───────────────────────────────────────────────────────────

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    success:     false,
    message:     err.message,
    details:     err.details || null,
    stack:       err.stack,
    error:       err,
  });
};

const sendProdError = (err, res) => {
  if (err.isOperational) {
    // Trusted operational error — safe to expose to client
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || null,
    });
  } else {
    // Unknown / programming error — don't leak details
    logger.error('UNHANDLED ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
};

// ── Main error handler middleware ─────────────────────────────────────────────
// Must have 4 parameters so Express recognises it as an error handler
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  // Always log errors
  logger.error(`[${req.method} ${req.originalUrl}] ${err.message}`, {
    statusCode: err.statusCode,
    userId:     req.user?._id,
    stack:      err.stack,
  });

  if (process.env.NODE_ENV === 'development') {
    return sendDevError(err, res);
  }

  // Transform known library errors into operational AppErrors
  let error = err;
  if (err.name === 'CastError')             error = handleCastError(err);
  if (err.code === 11000)                   error = handleDuplicateKeyError(err);
  if (err.name === 'ValidationError')       error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError')     error = handleJWTError();
  if (err.name === 'TokenExpiredError')     error = handleJWTExpiredError();

  sendProdError(error, res);
};

module.exports = errorHandler;
