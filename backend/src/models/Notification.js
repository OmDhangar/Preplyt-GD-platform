const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    type: {
      type:    String,
      enum:    Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Contextual data — e.g. { sessionId, sessionTitle } so frontend can deep-link
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    isRead:  { type: Boolean, default: false },
    readAt:  { type: Date },
  },
  {
    timestamps: true,
    // Auto-expire notifications after 60 days
    expireAfterSeconds: 60 * 24 * 60 * 60,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
