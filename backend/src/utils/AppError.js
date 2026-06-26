/**
 * Operational errors — expected failures we can predict and handle gracefully.
 * Programming errors (bugs) should NOT use this class; let them crash.
 */
class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status     = statusCode >= 500 ? 'error' : 'fail';
    this.isOperational = true;
    this.details    = details; // optional validation errors, etc.

    // Capture stack trace, excluding this constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
