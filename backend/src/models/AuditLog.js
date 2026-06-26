const mongoose = require('mongoose');

/**
 * AuditLog is append-only — never update or delete records.
 * Used for compliance, debugging, and forensic analysis.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    action:     { type: String, required: true },   // from AUDIT_ACTIONS constants
    resource:   { type: String },                   // e.g. 'GdSession', 'EvaluationRecord'
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    // Arbitrary context — what changed, what was the value, etc.
    metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
    ip:         { type: String },
    userAgent:  { type: String },
    success:    { type: Boolean, default: true },
    errorMsg:   { type: String },
  },
  {
    timestamps:  true,
    // Logs expire after 90 days to control collection size
    // Remove this line if you need permanent audit logs
    expireAfterSeconds: 90 * 24 * 60 * 60,
  }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
