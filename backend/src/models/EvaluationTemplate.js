const mongoose = require('mongoose');
const { TEMPLATE_STATUS, FIELD_TYPES } = require('../config/constants');

// Each rubric criterion is a "field" defined here.
// The frontend renders a UI control based on `type`.
const templateFieldSchema = new mongoose.Schema(
  {
    // Stable ID within the template — used as key in EvaluationRecord.fieldValues
    fieldId: {
      type:     String,
      required: true,
      trim:     true,
    },
    label: {
      type:     String,
      required: true,
      trim:     true,
    },
    type: {
      type:     String,
      required: true,
      enum:     Object.values(FIELD_TYPES),
    },
    description: { type: String, trim: true, default: '' },
    required:    { type: Boolean, default: false },
    order:       { type: Number,  default: 0 },   // display order in the form

    // ── number / weighted_score ─────────────────────────────────────────────
    min:      { type: Number, default: 0 },
    max:      { type: Number, default: 10 },
    step:     { type: Number, default: 1 },

    // ── weighted_score ──────────────────────────────────────────────────────
    // weight is the multiplier used when computing totalScore
    weight:   { type: Number, default: 1 },
    maxScore: { type: Number, default: 10 }, // before weight multiplication

    // ── select / multi_select ───────────────────────────────────────────────
    options: [{ type: String, trim: true }],

    // Controls whether students can see this field in their published report
    visibleToStudent: { type: Boolean, default: true },
  },
  { _id: false } // sub-docs; fieldId is the identifier
);

const evaluationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Template name is required'],
      trim:      true,
      maxlength: [120, 'Template name cannot exceed 120 characters'],
    },
    description: { type: String, trim: true, default: '' },
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    status: {
      type:    String,
      enum:    Object.values(TEMPLATE_STATUS),
      default: TEMPLATE_STATUS.DRAFT,
    },
    version: { type: Number, default: 1 },

    fields: {
      type:     [templateFieldSchema],
      validate: {
        validator: (fields) => fields.length > 0,
        message:   'A template must have at least one field',
      },
    },

    // Pre-computed for quick dashboard queries
    totalWeight: { type: Number, default: 0 },
    maxPossibleScore: { type: Number, default: 0 },

    isDefault:  { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },

    // Version lineage — when a template is updated on an active session,
    // we create a new version and keep the old one linked.
    parentTemplateId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'EvaluationTemplate',
      default: null,
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
evaluationTemplateSchema.index({ createdBy: 1, status: 1 });
evaluationTemplateSchema.index({ isDefault: 1 });

// ── Pre-save: recalculate totals ───────────────────────────────────────────────
evaluationTemplateSchema.pre('save', function (next) {
  if (this.isModified('fields')) {
    this.totalWeight      = this.fields.reduce((s, f) => s + (f.weight || 1), 0);
    this.maxPossibleScore = this.fields.reduce((s, f) => {
      if (f.type === FIELD_TYPES.WEIGHTED_SCORE) return s + f.maxScore * f.weight;
      if (f.type === FIELD_TYPES.NUMBER)         return s + f.max;
      return s;
    }, 0);
  }
  next();
});

module.exports = mongoose.model('EvaluationTemplate', evaluationTemplateSchema);
