const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { ROLES, INSTRUCTOR_VERIFICATION_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select:   false, // never returned in queries unless explicitly selected
    },
    role: {
      type:    String,
      enum:    Object.values(ROLES),
      default: ROLES.STUDENT,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    isBlacklisted: {
      type:    Boolean,
      default: false,
    },
    isEmailVerified: {
      type:    Boolean,
      default: false,
    },

    // ── Instructor verification by admin ────────────────────────────────────
    isVerified: {
      type:    Boolean,
      default: true, // students & admins are auto-verified; set to false for instructors in the register flow
    },
    verificationStatus: {
      type:    String,
      enum:    Object.values(INSTRUCTOR_VERIFICATION_STATUS),
      default: INSTRUCTOR_VERIFICATION_STATUS.APPROVED, // overridden to 'pending' for instructors
    },
    verifiedAt:  { type: Date },
    verifiedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true, default: '' },

    emailVerificationToken:        { type: String, select: false },
    emailVerificationExpires:      { type: Date,   select: false },
    passwordResetToken:            { type: String, select: false },
    passwordResetExpires:          { type: Date,   select: false },
    refreshTokens: {
      type:   [String],
      select: false,
      default: [],
    },
    lastLoginAt: Date,
    lastLoginIp: { type: String, select: false },
    avatar:       String,
    googleTokens: {
      accessToken:  { type: String, select: false },
      refreshToken: { type: String, select: false },
      expiryDate:   { type: Date,   select: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.googleTokens;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('googleConnected').get(function () {
  return !!(this.googleTokens && this.googleTokens.refreshToken);
});

// ── Indexes ────────────────────────────────────────────────────────────────────
// email index is created automatically via unique:true on the field
userSchema.index({ role: 1 });
userSchema.index({ role: 1, verificationStatus: 1 });

// ── Hooks ─────────────────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ── Instance Methods ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

// Crypto-based single-use tokens (email verification / password reset)
userSchema.methods.generateVerificationToken = function () {
  const crypto = require('crypto');
  const raw     = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken  = crypto.createHash('sha256').update(raw).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return raw; // send this in email, store hash
};

userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require('crypto');
  const raw    = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken   = crypto.createHash('sha256').update(raw).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  return raw;
};

module.exports = mongoose.model('User', userSchema);
