const mongoose = require('mongoose');
const { PARTICIPANT_STATUS } = require('../config/constants');

const sessionParticipantSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GdSession',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PARTICIPANT_STATUS),
      default: PARTICIPANT_STATUS.INVITED,
    },
    // Populated once payment is confirmed (if session requires payment)
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    isPaid: { type: Boolean, default: false },

    // Timestamps for lifecycle events
    invitedAt: { type: Date, default: Date.now },
    registeredAt: { type: Date },
    attendedAt: { type: Date },

    // Custom notes by instructor (not visible to student)
    instructorNotes: { type: String, select: false },

    // Temporary seat lock — expires after this timestamp (for paid session reservations)
    reservedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Compound unique: one student per session ───────────────────────────────────
sessionParticipantSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
sessionParticipantSchema.index({ studentId: 1, status: 1 });
sessionParticipantSchema.index({ sessionId: 1, status: 1 });

module.exports = mongoose.model('SessionParticipant', sessionParticipantSchema);
