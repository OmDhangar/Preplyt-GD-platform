const AuditLog = require('../models/AuditLog');
const logger   = require('../config/logger');

/**
 * Writes an audit entry.  Errors are swallowed so a logging failure
 * never breaks the actual request.
 */
const log = async ({
  userId     = null,
  action,
  resource   = null,
  resourceId = null,
  metadata   = {},
  ip         = null,
  userAgent  = null,
  success    = true,
  errorMsg   = null,
}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ip,
      userAgent,
      success,
      errorMsg,
    });
  } catch (err) {
    // Never let audit failure crash the application
    logger.warn('Audit log write failed:', { action, userId, err: err.message });
  }
};

/**
 * Convenience: build audit context from an Express request object.
 * Usage: auditService.fromReq(req, { action, resource, resourceId, metadata })
 */
const fromReq = (req, opts) =>
  log({
    userId:    req.user?._id || null,
    ip:        req.ip || req.connection?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
    ...opts,
  });

module.exports = { log, fromReq };
