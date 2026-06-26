const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },
    rollNumber:  { type: String, trim: true, default: '' },
    batch:       { type: String, trim: true, default: '' },  // e.g. "2024-26"
    program:     { type: String, trim: true, default: '' },  // e.g. "MBA"
    institution: { type: String, trim: true, default: '' },
    phone: {
      type:  String,
      match: [/^\+?[0-9]{7,15}$/, 'Please provide a valid phone number'],
    },
    // Aggregated stats — updated on session events
    stats: {
      totalSessionsAttended: { type: Number, default: 0 },
      totalSessionsInvited:  { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// userId index is created automatically via unique:true on the field
studentProfileSchema.index({ institution: 1, batch: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
