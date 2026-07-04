const mongoose = require('mongoose');

const sessionFeedbackSchema = new mongoose.Schema(
  {
    sessionId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'GdSession',
      required: [true, 'Session ID is required'],
    },
    studentId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Student ID is required'],
    },
    rating: {
      type:     Number,
      required: [true, 'Rating is required (1-5)'],
      min:      [1, 'Rating must be at least 1'],
      max:      [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

// Create compound unique index to prevent duplicate student feedback for a session
sessionFeedbackSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('SessionFeedback', sessionFeedbackSchema);
