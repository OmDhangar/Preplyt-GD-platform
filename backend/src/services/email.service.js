const nodemailer = require('nodemailer');
const logger     = require('../config/logger');

// ── Transport ──────────────────────────────────────────────────────────────────
const createTransport = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

// ── Core send ──────────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER) {
    logger.warn(`[Email] SMTP not configured — skipping email to ${to}: "${subject}"`);
    return;
  }

  const transporter = createTransport();
  const info = await transporter.sendMail({
    from:    `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''), // fallback plain text
  });

  logger.info(`[Email] Sent to ${to}: ${info.messageId}`);
  return info;
};

// ── Reusable HTML wrapper ──────────────────────────────────────────────────────
const wrap = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a56db">${title}</h2>
  ${body}
  <hr style="margin-top:32px;border:none;border-top:1px solid #eee"/>
  <p style="font-size:12px;color:#999">GD Evaluation Platform — This is an automated message.</p>
</body>
</html>`;

// ── Helper: format date for Indian timezone ────────────────────────────────────
const formatDate = (date) => {
  if (!date) return 'TBD';
  return new Date(date).toLocaleString('en-IN', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    timeZone: 'Asia/Kolkata',
  });
};

// ══════════════════════════════════════════════════════════════════════════════
//  NAMED EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. Signup Welcome (role-aware) ────────────────────────────────────────────
const sendSignupWelcome = (user) => {
  let roleMessage = '';
  if (user.role === 'instructor') {
    roleMessage = `
      <p>You have registered as an <strong>Instructor</strong>.</p>
      <p style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b">
        ⏳ <strong>Your account is pending admin verification.</strong><br/>
        You will receive an email once your account has been approved. Until then, some features will be restricted.
      </p>
    `;
  } else if (user.role === 'student') {
    roleMessage = `
      <p>You have registered as a <strong>Student</strong>. You can now browse and join Group Discussion sessions.</p>
    `;
  } else {
    roleMessage = `<p>Your account has been created as a <strong>${user.role}</strong>.</p>`;
  }

  return sendEmail({
    to:      user.email,
    subject: '🎉 Welcome to GD Eval Platform!',
    html:    wrap('Welcome to GD Eval Platform!', `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Thank you for signing up! We're excited to have you on board.</p>
      ${roleMessage}
      <p><a href="${process.env.FRONTEND_URL}/login"
           style="display:inline-block;background:#1a56db;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
        Log In to Your Account
      </a></p>
      <p style="color:#666;font-size:14px">If you have any questions, feel free to reach out to our support team.</p>
    `),
  });
};

// ── Legacy sendWelcome — alias for backward compat ────────────────────────────
const sendWelcome = sendSignupWelcome;

// ── 2. Email Verification ─────────────────────────────────────────────────────
const sendEmailVerification = (user, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  return sendEmail({
    to:      user.email,
    subject: 'Verify your email address',
    html:    wrap('Verify Your Email', `
      <p>Hi ${user.name},</p>
      <p>Please verify your email by clicking the button below (valid for 24 hours):</p>
      <p><a href="${url}" style="background:#1a56db;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">
        Verify Email
      </a></p>
      <p>Or copy: ${url}</p>
    `),
  });
};

// ── 3. Password Reset ─────────────────────────────────────────────────────────
const sendPasswordReset = (user, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail({
    to:      user.email,
    subject: 'Password Reset Request',
    html:    wrap('Reset Your Password', `
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click below (valid for 1 hour):</p>
      <p><a href="${url}" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">
        Reset Password
      </a></p>
      <p>If you didn't request this, please ignore this email.</p>
    `),
  });
};

// ── 4. Session Invite ─────────────────────────────────────────────────────────
const sendSessionInvite = (student, session, instructor) =>
  sendEmail({
    to:      student.email,
    subject: `You've been invited to GD: ${session.title}`,
    html:    wrap('GD Session Invitation', `
      <p>Hi ${student.name},</p>
      <p>You have been invited by <strong>${instructor.name}</strong> to participate in:</p>
      <p style="font-size:18px;font-weight:bold">${session.title}</p>
      ${session.scheduledAt ? `<p>📅 Scheduled: <strong>${formatDate(session.scheduledAt)}</strong></p>` : ''}
      ${session.joinCode ? `<p>🔑 Join Code: <strong style="font-size:22px;letter-spacing:4px">${session.joinCode}</strong></p>` : ''}
      ${session.googleMeetUrl ? `<p>📹 Google Meet: <a href="${session.googleMeetUrl}" style="color:#1a56db;font-weight:bold">${session.googleMeetUrl}</a></p>` : ''}
      <p><a href="${process.env.FRONTEND_URL}/student/sessions" 
           style="background:#1a56db;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">
        View Session
      </a></p>
    `),
  });

// ── 5. GD Subscription Confirmation ───────────────────────────────────────────
// Sent when a student subscribes/joins/pays for a GD
const sendGdSubscription = (student, session, instructor) =>
  sendEmail({
    to:      student.email,
    subject: `✅ You're registered for GD: ${session.title}`,
    html:    wrap('GD Registration Confirmed', `
      <p>Hi <strong>${student.name}</strong>,</p>
      <p>You have successfully registered for the following Group Discussion session:</p>
      
      <div style="background:#f0f7ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #1a56db">
        <p style="font-size:18px;font-weight:bold;margin:0 0 8px">${session.title}</p>
        ${session.topic ? `<p style="margin:4px 0">📋 <strong>Topic:</strong> ${session.topic}</p>` : ''}
        <p style="margin:4px 0">👨‍🏫 <strong>Instructor:</strong> ${instructor?.name || 'TBD'}</p>
        <p style="margin:4px 0">📅 <strong>Date & Time:</strong> ${formatDate(session.scheduledAt)}</p>
        <p style="margin:4px 0">⏱️ <strong>Duration:</strong> ${session.durationMins || 30} minutes</p>
        ${session.joinCode ? `<p style="margin:4px 0">🔑 <strong>Join Code:</strong> <span style="font-size:18px;letter-spacing:3px;font-weight:bold">${session.joinCode}</span></p>` : ''}
      </div>

      ${session.googleMeetUrl ? `
        <div style="background:#e8f5e9;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #16a34a">
          <p style="margin:0 0 8px;font-weight:bold">📹 Google Meet Link</p>
          <p style="margin:0"><a href="${session.googleMeetUrl}" style="color:#1a56db;font-size:16px;font-weight:bold">${session.googleMeetUrl}</a></p>
          <p style="margin:8px 0 0;font-size:13px;color:#666">Join the meeting at the scheduled time using this link.</p>
        </div>
      ` : ''}

      <p><a href="${process.env.FRONTEND_URL}/student/sessions"
           style="display:inline-block;background:#1a56db;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
        View Session Details
      </a></p>
      
      <p style="color:#666;font-size:14px">Make sure to join on time. You'll receive a reminder 30 minutes before the session.</p>
    `),
  });

// ── 6. GD Reminder (30 min before) ────────────────────────────────────────────
const sendGdReminder = (student, session, instructor) =>
  sendEmail({
    to:      student.email,
    subject: `⏰ Reminder: GD "${session.title}" starts in 30 minutes!`,
    html:    wrap('Your GD Session Starts Soon!', `
      <p>Hi <strong>${student.name}</strong>,</p>
      <p style="font-size:16px">Your Group Discussion session is starting in <strong style="color:#dc2626">30 minutes</strong>!</p>
      
      <div style="background:#fff3cd;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #f59e0b">
        <p style="font-size:18px;font-weight:bold;margin:0 0 8px">${session.title}</p>
        ${session.topic ? `<p style="margin:4px 0">📋 <strong>Topic:</strong> ${session.topic}</p>` : ''}
        <p style="margin:4px 0">👨‍🏫 <strong>Instructor:</strong> ${instructor?.name || 'TBD'}</p>
        <p style="margin:4px 0">📅 <strong>Starts at:</strong> ${formatDate(session.scheduledAt)}</p>
        <p style="margin:4px 0">⏱️ <strong>Duration:</strong> ${session.durationMins || 30} minutes</p>
      </div>

      ${session.googleMeetUrl ? `
        <div style="background:#e8f5e9;padding:16px;border-radius:8px;margin:16px 0;text-align:center">
          <p style="margin:0 0 12px;font-weight:bold;font-size:16px">📹 Join the Meeting Now</p>
          <a href="${session.googleMeetUrl}"
             style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Join Google Meet
          </a>
          <p style="margin:12px 0 0;font-size:13px;color:#666">${session.googleMeetUrl}</p>
        </div>
      ` : ''}

      <p style="color:#666;font-size:14px">Please be ready and join on time. Good luck! 🎯</p>
    `),
  });

// ── 7. GD Postponed / Rescheduled ─────────────────────────────────────────────
const sendGdPostponed = (student, session, instructor, oldDate, newDate) =>
  sendEmail({
    to:      student.email,
    subject: `📅 GD "${session.title}" has been rescheduled`,
    html:    wrap('GD Session Rescheduled', `
      <p>Hi <strong>${student.name}</strong>,</p>
      <p>The Group Discussion session you are registered for has been <strong>rescheduled</strong>:</p>
      
      <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #dc2626">
        <p style="margin:0;font-weight:bold;color:#dc2626">❌ Previous Schedule</p>
        <p style="margin:4px 0;text-decoration:line-through;color:#999">${formatDate(oldDate)}</p>
      </div>

      <div style="background:#e8f5e9;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #16a34a">
        <p style="margin:0;font-weight:bold;color:#16a34a">✅ New Schedule</p>
        <p style="margin:4px 0;font-size:16px;font-weight:bold">${formatDate(newDate)}</p>
      </div>

      <div style="background:#f0f7ff;padding:16px;border-radius:8px;margin:16px 0">
        <p style="font-size:16px;font-weight:bold;margin:0 0 8px">${session.title}</p>
        ${session.topic ? `<p style="margin:4px 0">📋 <strong>Topic:</strong> ${session.topic}</p>` : ''}
        <p style="margin:4px 0">👨‍🏫 <strong>Instructor:</strong> ${instructor?.name || 'TBD'}</p>
        <p style="margin:4px 0">⏱️ <strong>Duration:</strong> ${session.durationMins || 30} minutes</p>
      </div>

      ${session.googleMeetUrl ? `
        <div style="background:#e8f5e9;padding:12px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 4px;font-weight:bold">📹 Google Meet Link</p>
          <a href="${session.googleMeetUrl}" style="color:#1a56db;font-weight:bold">${session.googleMeetUrl}</a>
        </div>
      ` : ''}

      <p><a href="${process.env.FRONTEND_URL}/student/sessions"
           style="display:inline-block;background:#1a56db;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
        View Updated Session
      </a></p>
      
      <p style="color:#666;font-size:14px">We apologize for any inconvenience. You will receive a new reminder before the updated session time.</p>
    `),
  });

// ── 8. Instructor Verified ────────────────────────────────────────────────────
const sendInstructorVerified = (user) =>
  sendEmail({
    to:      user.email,
    subject: '✅ Your Instructor Account Has Been Verified!',
    html:    wrap('Account Verified!', `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p style="font-size:16px">Great news! Your instructor account has been <strong style="color:#16a34a">approved</strong> by the admin.</p>
      
      <div style="background:#e8f5e9;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #16a34a">
        <p style="margin:0;font-size:16px">You now have full access to all instructor features:</p>
        <ul style="margin:8px 0 0;padding-left:20px">
          <li>Create and manage GD sessions</li>
          <li>Evaluate students</li>
          <li>Create evaluation templates</li>
          <li>Generate Google Meet links</li>
        </ul>
      </div>

      <p><a href="${process.env.FRONTEND_URL}/instructor/dashboard"
           style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
        Go to Dashboard
      </a></p>
    `),
  });

// ── 9. Instructor Rejected ────────────────────────────────────────────────────
const sendInstructorRejected = (user, reason) =>
  sendEmail({
    to:      user.email,
    subject: '❌ Instructor Verification Update',
    html:    wrap('Verification Update', `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Unfortunately, your instructor account verification request has been <strong style="color:#dc2626">declined</strong>.</p>
      
      ${reason ? `
        <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #dc2626">
          <p style="margin:0;font-weight:bold">Reason:</p>
          <p style="margin:8px 0 0">${reason}</p>
        </div>
      ` : ''}

      <p>If you believe this was a mistake, please contact our support team for further assistance.</p>
      <p><a href="mailto:${process.env.EMAIL_FROM_ADDRESS}"
           style="display:inline-block;background:#1a56db;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
        Contact Support
      </a></p>
    `),
  });

// ── 10. Results Published ─────────────────────────────────────────────────────
const sendResultsPublished = (student, session) =>
  sendEmail({
    to:      student.email,
    subject: `Your GD evaluation results are ready — ${session.title}`,
    html:    wrap('Your Results Are Ready', `
      <p>Hi ${student.name},</p>
      <p>Your evaluation results for <strong>${session.title}</strong> have been published.</p>
      <p><a href="${process.env.FRONTEND_URL}/student/results/${session._id}"
           style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">
        View Results
      </a></p>
    `),
  });

// ── 11. Payment Confirmation ──────────────────────────────────────────────────
const sendPaymentConfirmation = (user, payment, session) =>
  sendEmail({
    to:      user.email,
    subject: `Payment Confirmed — ${session.title}`,
    html:    wrap('Payment Confirmed ✓', `
      <p>Hi ${user.name},</p>
      <p>Your payment of <strong>₹${(payment.amount / 100).toFixed(2)}</strong> for 
         <strong>${session.title}</strong> has been confirmed.</p>
      <p>Transaction ID: <code>${payment.razorpay?.paymentId || payment._id}</code></p>
      <p>You are now registered for this GD session.</p>
    `),
  });

// ── 12. B2B Request Admin Notification ──────────────────────────────────────────
const sendB2bAdminNotification = (b2bRequest) => {
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL || process.env.SMTP_USER;
  return sendEmail({
    to:      adminEmail,
    subject: `🏢 New B2B Pilot Request: ${b2bRequest.college}`,
    html:    wrap('New B2B Pilot Request', `
      <p>A new institute has requested a Group Discussion (GD) pilot session.</p>
      <div style="background:#f0f7ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #1a56db">
        <p style="margin:4px 0"><strong>College:</strong> ${b2bRequest.college}</p>
        <p style="margin:4px 0"><strong>Name:</strong> ${b2bRequest.name}</p>
        <p style="margin:4px 0"><strong>Designation:</strong> ${b2bRequest.designation}</p>
        <p style="margin:4px 0"><strong>City:</strong> ${b2bRequest.city}</p>
        <p style="margin:4px 0"><strong>Approx. Students:</strong> ${b2bRequest.students}</p>
        <p style="margin:4px 0"><strong>Phone:</strong> ${b2bRequest.phone}</p>
        <p style="margin:4px 0"><strong>Email:</strong> ${b2bRequest.email}</p>
      </div>
      <p>Please log in to your admin dashboard to review and manage this request.</p>
    `),
  });
};

// ── 13. B2B Request Thank You (Institute) ────────────────────────────────────────
const sendB2bThankYou = (b2bRequest) => {
  return sendEmail({
    to:      b2bRequest.email,
    subject: 'Thank You for Requesting a Preplyt Pilot Session!',
    html:    wrap('Thank You for Reaching Out!', `
      <p>Dear <strong>${b2bRequest.name}</strong>,</p>
      <p>Thank you for your interest in PrepLyt's B2B program! We have received your request for a pilot session for <strong>${b2bRequest.college}</strong>.</p>
      <p>Our team is currently reviewing the details of your batch (approx. <strong>${b2bRequest.students} students</strong>) and we will reach out to you within the next 24 hours to schedule the session.</p>
      <p>If you have any urgent questions, feel free to reply directly to this email or reach out to us at <a href="mailto:preplyt1@gmail.com">preplyt1@gmail.com</a>.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>The PrepLyt Team</strong></p>
    `),
  });
};

module.exports = {
  sendEmail,
  sendWelcome,
  sendSignupWelcome,
  sendEmailVerification,
  sendPasswordReset,
  sendSessionInvite,
  sendGdSubscription,
  sendGdReminder,
  sendGdPostponed,
  sendInstructorVerified,
  sendInstructorRejected,
  sendResultsPublished,
  sendPaymentConfirmation,
  sendB2bAdminNotification,
  sendB2bThankYou,
};

