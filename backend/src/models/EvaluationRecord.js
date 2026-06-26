const mongoose = require('mongoose');
const { EVALUATION_STATUS, FIELD_TYPES } = require('../config/constants');

/**
 * Each field value stores its own timestamp (scoredAt) so the server can apply
 * Last-Write-Wins (LWW) when merging concurrent updates from multiple devices.
 *
 * The socket layer broadcasts field updates without writing to DB.
 * The REST batch endpoint (PATCH /evaluations/batch) is the only persistence path.
 */
const fieldValueSchema = new mongoose.Schema(
  {
    fieldId:     { type: String, required: true },
    value:       { type: mongoose.Schema.Types.Mixed },  // number | string | string[] | boolean
    scoredAt:    { type: Date, default: Date.now },       // LWW key
    deviceLabel: { type: String, default: '' },           // e.g. "Laptop", "Phone"
  },
  { _id: false }
);

const evaluationRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'GdSession',
      required: true,
    },
    studentId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    instructorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    templateId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'EvaluationTemplate',
      required: true,
    },
    templateVersion: { type: Number, default: 1 },

    status: {
      type:    String,
      enum:    Object.values(EVALUATION_STATUS),
      default: EVALUATION_STATUS.DRAFT,
    },

    // Map of fieldId → {value, scoredAt, deviceLabel}
    fieldValues: { type: [fieldValueSchema], default: [] },

    // Computed on submit/publish from template weights
    totalScore:    { type: Number, default: null },
    maxScore:      { type: Number, default: null },
    percentScore:  { type: Number, default: null },
    calculatedAt:  { type: Date },

    // Instructor's overall comment (not tied to a field)
    overallComment: { type: String, trim: true, default: '' },

    // Lifecycle timestamps
    lastUpdatedAt: { type: Date, default: Date.now },
    submittedAt:   { type: Date },
    publishedAt:   { type: Date },

    // Optimistic concurrency — incremented on every batch write
    // Frontend can use this to detect stale state
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Primary fetch pattern: load all records for a session × instructor pair
evaluationRecordSchema.index({ sessionId: 1, instructorId: 1 });
// Check if a specific student has been evaluated
evaluationRecordSchema.index({ sessionId: 1, studentId: 1, instructorId: 1 }, { unique: true });
evaluationRecordSchema.index({ studentId: 1, status: 1 });

// ── Helper: apply field-level LWW update ─────────────────────────────────────
/**
 * Merges an incoming field update using Last-Write-Wins per fieldId.
 * Returns true if the update was applied, false if it was stale.
 */
evaluationRecordSchema.methods.applyFieldUpdate = function ({ fieldId, value, scoredAt, deviceLabel }) {
  const incoming = new Date(scoredAt || Date.now());
  const idx      = this.fieldValues.findIndex((fv) => fv.fieldId === fieldId);

  if (idx === -1) {
    // New field — always apply
    this.fieldValues.push({ fieldId, value, scoredAt: incoming, deviceLabel });
    this.lastUpdatedAt = new Date();
    return true;
  }

  const existing = this.fieldValues[idx];
  if (incoming >= new Date(existing.scoredAt)) {
    // Incoming is equal or newer — apply
    this.fieldValues[idx] = { fieldId, value, scoredAt: incoming, deviceLabel };
    this.lastUpdatedAt = new Date();
    return true;
  }

  return false; // stale update — ignore
};

/**
 * Compute totalScore from field values and template fields.
 * Call this before submit/publish.
 */
evaluationRecordSchema.methods.computeScore = function (templateFields) {
  let total = 0;
  let max   = 0;

  templateFields.forEach((field) => {
    const fv = this.fieldValues.find((f) => f.fieldId === field.fieldId);
    if (!fv || fv.value == null) return;

    if (field.type === FIELD_TYPES.WEIGHTED_SCORE) {
      total += Number(fv.value) * field.weight;
      max   += field.maxScore * field.weight;
    } else if (field.type === FIELD_TYPES.NUMBER) {
      total += Number(fv.value);
      max   += field.max;
    }
  });

  this.totalScore   = parseFloat(total.toFixed(2));
  this.maxScore     = parseFloat(max.toFixed(2));
  this.percentScore = max > 0 ? parseFloat(((total / max) * 100).toFixed(2)) : null;
  this.calculatedAt = new Date();
};

module.exports = mongoose.model('EvaluationRecord', evaluationRecordSchema);
