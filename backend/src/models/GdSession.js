const mongoose = require('mongoose');
const { SESSION_STATUS } = require('../config/constants');
const crypto = require('crypto');

const gdSessionSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Session title is required'],
      trim:      true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: { type: String, trim: true, default: '' },
    topic:       { type: String, trim: true, default: '' }, // GD topic/prompt

    instructorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    coInstructors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    }],

    // Track who created the session (admin vs instructor)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },

    templateId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'EvaluationTemplate',
      required: true,
    },
    // Snapshot of template version used — avoids issues if template is edited later
    templateVersion: { type: Number, default: 1 },

    status: {
      type:    String,
      enum:    Object.values(SESSION_STATUS),
      default: SESSION_STATUS.DRAFT,
    },

    scheduledAt:  { type: Date },
    startedAt:    { type: Date },
    endedAt:      { type: Date },
    durationMins: { type: Number, default: 30 },

    maxParticipants: { type: Number, default: 50 },

    // Short alphanumeric code students use to self-register
    joinCode: {
      type:   String,
      unique: true,
      sparse: true,
    },

    // Whether payment is required to register for this session
    requiresPayment: { type: Boolean, default: false },
    sessionFee: {
      amount:   { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
    },

    // Per-session settings
    settings: {
      allowSelfRegistration: { type: Boolean, default: false },
      publishResultsAuto:    { type: Boolean, default: false },
      evaluationVisibility:  { type: String, enum: ['instructors', 'all'], default: 'instructors' },
    },

    // Denormalized counter — avoids counting participants on every request
    participantCount: { type: Number, default: 0 },
    evaluatedCount:   { type: Number, default: 0 }, // how many have a submitted evaluation

    tags: [{ type: String, trim: true }],
    googleMeetUrl: { type: String, trim: true, default: '' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Attachments for subscribed students ──────────────────────────────────
    attachments: [{
      title:       { type: String, required: true, trim: true },
      description: { type: String, trim: true, default: '' },
      fileUrl:     { type: String, required: true },
      fileType:    { type: String, trim: true, default: '' },
      fileSize:    { type: Number, default: 0 },
      uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt:  { type: Date, default: Date.now },
    }],

    // ── Email reminder tracking ─────────────────────────────────────────────
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
gdSessionSchema.index({ instructorId: 1, status: 1 });
gdSessionSchema.index({ scheduledAt: -1 });
// joinCode index is created automatically by unique:true sparse on the field
gdSessionSchema.index({ 'coInstructors': 1 });
gdSessionSchema.index({ scheduledAt: 1, status: 1, reminderSent: 1 }); // for cron reminder queries

// ── Generate join code and Google Meet URL before first save ───────────────────
gdSessionSchema.pre('save', function (next) {
  if (this.isNew && !this.joinCode) {
    // 6-char uppercase alphanumeric
    this.joinCode = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  }
  if (!this.googleMeetUrl) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const part2 = Array.from({length: 4}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const part3 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    this.googleMeetUrl = `https://meet.google.com/${part1}-${part2}-${part3}`;
  }
  if (this.scheduledAt && this.status === 'draft') {
    this.status = 'scheduled';
  }
  next();
});

// ── Virtual: is session editable ──────────────────────────────────────────────
gdSessionSchema.virtual('isEditable').get(function () {
  return [SESSION_STATUS.DRAFT, SESSION_STATUS.SCHEDULED].includes(this.status);
});

gdSessionSchema.virtual('price')
  .get(function () {
    return this.sessionFee?.amount;
  })
  .set(function (val) {
    if (!this.sessionFee) this.sessionFee = {};
    this.sessionFee.amount = val;
  });

gdSessionSchema.virtual('currency')
  .get(function () {
    return this.sessionFee?.currency;
  })
  .set(function (val) {
    if (!this.sessionFee) this.sessionFee = {};
    this.sessionFee.currency = val;
  });

// Ensure virtuals are serialized
gdSessionSchema.set('toJSON', { virtuals: true });
gdSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GdSession', gdSessionSchema);
