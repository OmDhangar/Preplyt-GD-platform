const mongoose = require('mongoose');

const b2bRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    college: {
      type: String,
      required: [true, 'College/Institute name is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    students: {
      type: Number,
      required: [true, 'Number of students is required'],
      min: [1, 'Number of students must be at least 1'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Work email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'contacted'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('B2bRequest', b2bRequestSchema);
