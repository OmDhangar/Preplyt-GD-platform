const mongoose = require('mongoose');

const instructorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },
    organization: { type: String, trim: true, default: '' },
    designation:  { type: String, trim: true, default: '' },
    specializations: [{ type: String, trim: true }],
    bio: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default:   '',
    },
    // Aggregated counters — updated in-place for quick dashboard reads
    stats: {
      totalSessionsConducted: { type: Number, default: 0 },
      totalStudentsEvaluated: { type: Number, default: 0 },
      totalTemplatesCreated:  { type: Number, default: 0 },
    },
    // Default template preference
    defaultTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'EvaluationTemplate',
      default: null,
    },
  },
  { timestamps: true }
);

// userId index is created automatically via unique:true on the field

module.exports = mongoose.model('InstructorProfile', instructorProfileSchema);
