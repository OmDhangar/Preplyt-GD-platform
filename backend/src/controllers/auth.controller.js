const crypto        = require('crypto');
const jwt           = require('jsonwebtoken');
const User          = require('../models/User');
const InstructorProfile = require('../models/InstructorProfile');
const StudentProfile    = require('../models/StudentProfile');
const asyncHandler  = require('../utils/asyncHandler');
const AppError      = require('../utils/AppError');
const { success, created } = require('../utils/apiResponse');
const emailService  = require('../services/email.service');
const auditService  = require('../services/audit.service');
const { AUDIT_ACTIONS, ROLES, INSTRUCTOR_VERIFICATION_STATUS } = require('../config/constants');

// ── Register ───────────────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role = ROLES.STUDENT } = req.body;

  // Prevent admin self-registration through public API
  if (role === ROLES.ADMIN) {
    return next(new AppError('Admin accounts cannot be created via this endpoint.', 403));
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // Instructors need admin verification; students are auto-verified
  const isInstructor = role === ROLES.INSTRUCTOR;
  const user = await User.create({
    name,
    email,
    password,
    role,
    isVerified:         isInstructor ? false : true,
    verificationStatus: isInstructor
      ? INSTRUCTOR_VERIFICATION_STATUS.PENDING
      : INSTRUCTOR_VERIFICATION_STATUS.APPROVED,
  });

  // Auto-create the role-specific profile
  if (isInstructor) {
    await InstructorProfile.create({ userId: user._id });
  } else {
    await StudentProfile.create({ userId: user._id });
  }

  // Send verification email (non-blocking)
  const verifyToken = user.generateVerificationToken();
  await user.save({ validateBeforeSave: false });
  emailService.sendEmailVerification(user, verifyToken).catch(() => {});
  emailService.sendSignupWelcome(user).catch(() => {});

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshTokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  auditService.fromReq(req, { action: AUDIT_ACTIONS.USER_REGISTER, resource: 'User', resourceId: user._id });

  created(res, { user, accessToken, refreshToken }, 'Account created successfully');
});

// ── Login ──────────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshTokens +isActive +isBlacklisted');
  if (!user || !user.isActive) {
    return next(new AppError('Invalid email or password.', 401));
  }
  if (user.isBlacklisted) {
    return next(new AppError('Your account has been blacklisted.', 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    auditService.fromReq(req, {
      action: AUDIT_ACTIONS.USER_LOGIN,
      resource: 'User',
      resourceId: user._id,
      success: false,
      errorMsg: 'Wrong password',
    });
    return next(new AppError('Invalid email or password.', 401));
  }

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Keep max 5 refresh tokens per user (multi-device)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  user.lastLoginAt   = new Date();
  user.lastLoginIp   = req.ip;
  await user.save({ validateBeforeSave: false });

  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.USER_LOGIN,
    resource: 'User',
    resourceId: user._id,
  });

  success(res, { user, accessToken, refreshToken }, 'Login successful');
});

// ── Refresh Token ──────────────────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new AppError('Invalid or expired refresh token.', 401));
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !user.refreshTokens?.includes(refreshToken)) {
    // Token not in the DB — possible theft, revoke all tokens
    if (user) {
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
    }
    return next(new AppError('Refresh token reuse detected. Please log in again.', 401));
  }

  // Rotate: remove old, issue new
  const newAccessToken  = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();
  user.refreshTokens = user.refreshTokens
    .filter((t) => t !== refreshToken)
    .concat(newRefreshToken)
    .slice(-5);
  await user.save({ validateBeforeSave: false });

  success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
});

// ── Logout ─────────────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken && req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: refreshToken },
    });
  }
  auditService.fromReq(req, {
    action: AUDIT_ACTIONS.USER_LOGOUT,
    resource: 'User',
    resourceId: req.user?._id,
  });
  success(res, null, 'Logged out successfully');
});

// ── Verify Email ───────────────────────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user   = await User.findOne({
    emailVerificationToken:   hashed,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return next(new AppError('Verification token is invalid or has expired.', 400));
  }

  user.isEmailVerified          = true;
  user.emailVerificationToken   = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  success(res, null, 'Email verified successfully');
});

// ── Forgot Password ────────────────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  // Always return 200 — don't reveal whether email exists
  if (user) {
    const token = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });
    emailService.sendPasswordReset(user, token).catch(() => {});
  }
  success(res, null, 'If that email exists, a reset link has been sent.');
});

// ── Reset Password ─────────────────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user   = await User.findOne({
    passwordResetToken:   hashed,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return next(new AppError('Password reset token is invalid or has expired.', 400));
  }

  user.password             = req.body.password;
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens        = []; // invalidate all sessions on password change
  await user.save();

  auditService.fromReq(req, {
    action:   AUDIT_ACTIONS.PASSWORD_RESET,
    resource: 'User',
    resourceId: user._id,
  });

  success(res, null, 'Password reset successful. Please log in with your new password.');
});

// ── POST /api/auth/google ──────────────────────────────────────────────────────
exports.googleLogin = asyncHandler(async (req, res, next) => {
  const { token, role = ROLES.STUDENT } = req.body;

  let email, name, avatar;

  if (token.startsWith('mock_google_token_')) {
    // Development/testing offline fallback
    email = token.replace('mock_google_token_', '');
    name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
  } else {
    // Real google verification
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      const payload = await response.json();
      if (payload.error || !payload.email) {
        return next(new AppError('Invalid Google token', 400));
      }
      email = payload.email;
      name = payload.name || email.split('@')[0];
      avatar = payload.picture;
    } catch (err) {
      return next(new AppError('Failed to verify Google token: ' + err.message, 400));
    }
  }

  // Find or create user
  let user = await User.findOne({ email }).select('+refreshTokens +isActive');
  if (!user) {
    // Create random password (user registers with Google)
    const crypto = require('crypto');
    const password = crypto.randomBytes(16).toString('hex') + 'Aa1!';

    const isInstructor = role === ROLES.INSTRUCTOR;
    user = await User.create({
      name,
      email,
      password,
      role,
      isEmailVerified: true,
      avatar,
      isVerified:         isInstructor ? false : true,
      verificationStatus: isInstructor
        ? INSTRUCTOR_VERIFICATION_STATUS.PENDING
        : INSTRUCTOR_VERIFICATION_STATUS.APPROVED,
    });

    // Auto-create role-specific profile
    if (isInstructor) {
      await InstructorProfile.create({ userId: user._id });
    } else {
      await StudentProfile.create({ userId: user._id });
    }

    // Send signup welcome email
    emailService.sendSignupWelcome(user).catch(() => {});
  } else {
    // If user exists, update name/avatar if empty
    if (avatar && !user.avatar) {
      user.avatar = avatar;
      await user.save({ validateBeforeSave: false });
    }
  }

  if (!user.isActive) {
    return next(new AppError('This account is deactivated.', 401));
  }
  if (user.isBlacklisted) {
    return next(new AppError('Your account has been blacklisted.', 403));
  }

  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  user.lastLoginAt   = new Date();
  user.lastLoginIp   = req.ip;
  await user.save({ validateBeforeSave: false });

  success(res, { user, accessToken, refreshToken }, 'Login successful');
});

// ── GET /api/auth/google/connect-url ─────────────────────────────────────────
exports.getGoogleConnectUrl = asyncHandler(async (req, res, next) => {
  const redirectUri = req.query.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback';
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    // Return a mock URL that goes directly to the callback route with mock authorization code
    return success(res, {
      authUrl: `${req.protocol}://${req.get('host')}/api/auth/google/callback?code=mock_authorization_code`
    });
  }
  
  const scope = 'https://www.googleapis.com/auth/calendar.events';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  
  success(res, { authUrl: url });
});

// ── POST /api/auth/google/callback ───────────────────────────────────────────
exports.googleCallback = asyncHandler(async (req, res, next) => {
  const { code, redirectUri } = req.body;
  if (!code) {
    return next(new AppError('Authorization code is required', 400));
  }

  const user = await User.findById(req.user._id).select('+googleTokens');
  if (!user) return next(new AppError('User not found', 404));

  // Handle mock mode
  if (code === 'mock_authorization_code' || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    user.googleTokens = {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiryDate: new Date(Date.now() + 3600 * 1000),
    };
    await user.save({ validateBeforeSave: false });
    return success(res, { googleConnected: true }, 'Google Calendar connected successfully (Mock Mode)');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${errBody}`);
    }

    const data = await tokenRes.json();
    
    // Construct token payload
    const tokens = {
      accessToken: data.access_token,
      expiryDate: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    };
    
    // Save refresh token if returned by Google
    if (data.refresh_token) {
      tokens.refreshToken = data.refresh_token;
    } else if (user.googleTokens && user.googleTokens.refreshToken) {
      // Retain existing refresh token if not returned
      tokens.refreshToken = user.googleTokens.refreshToken;
    }

    user.googleTokens = tokens;
    await user.save({ validateBeforeSave: false });
    success(res, { googleConnected: true }, 'Google Calendar connected successfully');
  } catch (error) {
    console.error('Google Callback Error:', error);
    return next(new AppError(`Google authentication failed: ${error.message}`, 400));
  }
});

// ── DELETE /api/auth/google/disconnect ───────────────────────────────────────
exports.googleDisconnect = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+googleTokens');
  if (!user) return next(new AppError('User not found', 404));

  user.googleTokens = undefined;
  await user.save({ validateBeforeSave: false });

  success(res, { googleConnected: false }, 'Google Calendar disconnected successfully');
});
