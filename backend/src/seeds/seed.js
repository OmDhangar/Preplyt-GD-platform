/**
 * Seed script — populates the DB with a complete, runnable demo dataset.
 *
 * Usage:
 *   node src/seeds/seed.js           # seed (skips if data exists)
 *   node src/seeds/seed.js --clear   # drop everything, then re-seed
 *   node src/seeds/seed.js --force   # re-seed even if data exists
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const logger     = require('../config/logger');

// Models
const User               = require('../models/User');
const InstructorProfile  = require('../models/InstructorProfile');
const StudentProfile     = require('../models/StudentProfile');
const EvaluationTemplate = require('../models/EvaluationTemplate');
const GdSession          = require('../models/GdSession');
const SessionParticipant = require('../models/SessionParticipant');
const EvaluationRecord   = require('../models/EvaluationRecord');
const Payment            = require('../models/Payment');
const Notification       = require('../models/Notification');
const AuditLog           = require('../models/AuditLog');

const { ROLES, SESSION_STATUS, EVALUATION_STATUS, PARTICIPANT_STATUS,
        PAYMENT_STATUS, TEMPLATE_STATUS, FIELD_TYPES, NOTIFICATION_TYPES } = require('../config/constants');

// ── Demo credentials (logged to console after seed) ───────────────────────────
const ADMIN_EMAIL       = 'admin@gdeval.dev';
const INSTRUCTOR_EMAIL  = 'instructor@gdeval.dev';
const INSTRUCTOR2_EMAIL = 'instructor2@gdeval.dev';
const STUDENT_EMAILS    = [
  'aryan.sharma@gdeval.dev',
  'priya.patel@gdeval.dev',
  'rohit.verma@gdeval.dev',
  'neha.singh@gdeval.dev',
  'karthik.nair@gdeval.dev',
];
const DEMO_PASSWORD = 'Demo@1234';

async function hashPw(pw) {
  return bcrypt.hash(pw, 10);
}

// ── Template definitions ──────────────────────────────────────────────────────
const MBA_GD_TEMPLATE_FIELDS = [
  {
    fieldId: 'communication',
    label:   'Communication Skills',
    type:    FIELD_TYPES.WEIGHTED_SCORE,
    description: 'Clarity, vocabulary, and articulation',
    required: true,
    order:    1,
    min: 0, max: 10, step: 1,
    weight:   2,
    maxScore: 10,
    visibleToStudent: true,
  },
  {
    fieldId: 'content_knowledge',
    label:   'Content & Knowledge',
    type:    FIELD_TYPES.WEIGHTED_SCORE,
    description: 'Depth and accuracy of information presented',
    required: true,
    order:    2,
    min: 0, max: 10, step: 1,
    weight:   2,
    maxScore: 10,
    visibleToStudent: true,
  },
  {
    fieldId: 'leadership',
    label:   'Leadership',
    type:    FIELD_TYPES.NUMBER,
    description: 'Ability to lead, initiate, and steer the discussion',
    required: true,
    order:    3,
    min: 0, max: 10, step: 1,
    visibleToStudent: true,
  },
  {
    fieldId: 'listening',
    label:   'Listening & Responsiveness',
    type:    FIELD_TYPES.NUMBER,
    description: 'Active listening and ability to build on others\' points',
    required: true,
    order:    4,
    min: 0, max: 10,
    visibleToStudent: true,
  },
  {
    fieldId: 'body_language',
    label:   'Body Language & Confidence',
    type:    FIELD_TYPES.SELECT,
    description: 'Non-verbal communication and self-confidence',
    required: false,
    order:    5,
    options: ['Excellent', 'Good', 'Average', 'Poor'],
    visibleToStudent: true,
  },
  {
    fieldId: 'entry_quality',
    label:   'Entry Quality',
    type:    FIELD_TYPES.SELECT,
    description: 'How the candidate entered the discussion',
    required: false,
    order:    6,
    options: ['Strong opener', 'Good mid-entry', 'Weak entry', 'Did not enter'],
    visibleToStudent: false, // internal instructor note
  },
  {
    fieldId: 'is_dominant',
    label:   'Dominating / Aggressive?',
    type:    FIELD_TYPES.BOOLEAN,
    description: 'Flag if candidate was overly dominant or aggressive',
    required: false,
    order:    7,
    visibleToStudent: false,
  },
  {
    fieldId: 'comments',
    label:   'Instructor Comments',
    type:    FIELD_TYPES.TEXT,
    description: 'Free-form observations',
    required: false,
    order:    8,
    visibleToStudent: false,
  },
];

const QUICK_TEMPLATE_FIELDS = [
  {
    fieldId: 'overall_score',
    label:   'Overall Score',
    type:    FIELD_TYPES.NUMBER,
    required: true,
    order:   1,
    min: 0, max: 100,
    visibleToStudent: true,
  },
  {
    fieldId: 'verbal',
    label:   'Verbal Communication',
    type:    FIELD_TYPES.SELECT,
    required: true,
    order:   2,
    options: ['Excellent', 'Good', 'Needs Improvement'],
    visibleToStudent: true,
  },
  {
    fieldId: 'notes',
    label:   'Notes',
    type:    FIELD_TYPES.TEXT,
    required: false,
    order:   3,
    visibleToStudent: false,
  },
];

// ── Main seed function ─────────────────────────────────────────────────────────
async function seed() {
  const args  = process.argv.slice(2);
  const clear = args.includes('--clear');
  const force = args.includes('--force');

  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Connected to MongoDB');

  if (clear) {
    logger.info('Clearing all collections…');
    await Promise.all([
      User.deleteMany({}),
      InstructorProfile.deleteMany({}),
      StudentProfile.deleteMany({}),
      EvaluationTemplate.deleteMany({}),
      GdSession.deleteMany({}),
      SessionParticipant.deleteMany({}),
      EvaluationRecord.deleteMany({}),
      Payment.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    logger.info('All collections cleared');
  } else if (!force) {
    const count = await User.countDocuments();
    if (count > 0) {
      logger.info(`Seed skipped — ${count} users already exist. Use --force to re-seed or --clear to wipe.`);
      await mongoose.disconnect();
      return;
    }
  }

  // ── 1. Users ───────────────────────────────────────────────────────────────
  const hashedPw = DEMO_PASSWORD;

  const [admin, instructor1, instructor2, ...students] = await User.create([
    {
      name:     'Admin User',
      email:    ADMIN_EMAIL,
      password: hashedPw,
      role:     ROLES.ADMIN,
      isEmailVerified: true,
    },
    {
      name:     'Dr. Anita Desai',
      email:    INSTRUCTOR_EMAIL,
      password: hashedPw,
      role:     ROLES.INSTRUCTOR,
      isEmailVerified: true,
    },
    {
      name:     'Prof. Suresh Menon',
      email:    INSTRUCTOR2_EMAIL,
      password: hashedPw,
      role:     ROLES.INSTRUCTOR,
      isEmailVerified: true,
    },
    {
      name:     'Aryan Sharma',
      email:    STUDENT_EMAILS[0],
      password: hashedPw,
      role:     ROLES.STUDENT,
      isEmailVerified: true,
    },
    {
      name:     'Priya Patel',
      email:    STUDENT_EMAILS[1],
      password: hashedPw,
      role:     ROLES.STUDENT,
      isEmailVerified: true,
    },
    {
      name:     'Rohit Verma',
      email:    STUDENT_EMAILS[2],
      password: hashedPw,
      role:     ROLES.STUDENT,
      isEmailVerified: true,
    },
    {
      name:     'Neha Singh',
      email:    STUDENT_EMAILS[3],
      password: hashedPw,
      role:     ROLES.STUDENT,
      isEmailVerified: true,
    },
    {
      name:     'Karthik Nair',
      email:    STUDENT_EMAILS[4],
      password: hashedPw,
      role:     ROLES.STUDENT,
      isEmailVerified: true,
    },
  ]);
  logger.info(`Created ${2 + 1 + students.length} users`);

  // ── 2. Profiles ────────────────────────────────────────────────────────────
  await InstructorProfile.create([
    {
      userId:          instructor1._id,
      organization:    'IIM Nagpur',
      designation:     'Associate Professor',
      specializations: ['MBA Admissions', 'GD Facilitation', 'Soft Skills'],
      bio:             'Over 10 years of experience in MBA GD/PI process.',
      stats:           { totalSessionsConducted: 48, totalStudentsEvaluated: 312 },
    },
    {
      userId:          instructor2._id,
      organization:    'IIM Nagpur',
      designation:     'Senior Lecturer',
      specializations: ['Communication Skills', 'Leadership Assessment'],
      bio:             'Specialist in personality assessment and communication evaluation.',
      stats:           { totalSessionsConducted: 22, totalStudentsEvaluated: 160 },
    },
  ]);

  await StudentProfile.create(
    students.map((s, i) => ({
      userId:      s._id,
      rollNumber:  `MBA24${String(i + 1).padStart(3, '0')}`,
      batch:       '2024-26',
      program:     'MBA',
      institution: 'IIM Nagpur',
      phone:       `+9198765432${i}0`,
    }))
  );
  logger.info('Created instructor and student profiles');

  // ── 3. Evaluation Templates ────────────────────────────────────────────────
  const [mbaTemplate, quickTemplate] = await EvaluationTemplate.create([
    {
      name:        'MBA GD Standard Rubric',
      description: 'Comprehensive evaluation template for MBA Group Discussion rounds',
      createdBy:   instructor1._id,
      status:      TEMPLATE_STATUS.ACTIVE,
      isDefault:   true,
      fields:      MBA_GD_TEMPLATE_FIELDS,
      tags:        ['MBA', 'standard', 'IIM'],
    },
    {
      name:        'Quick Evaluation Sheet',
      description: 'Rapid 3-point assessment for informal GD practice sessions',
      createdBy:   instructor1._id,
      status:      TEMPLATE_STATUS.ACTIVE,
      fields:      QUICK_TEMPLATE_FIELDS,
      tags:        ['quick', 'practice'],
    },
  ]);
  logger.info('Created 2 evaluation templates');

  // Update instructor default template reference
  await InstructorProfile.findOneAndUpdate(
    { userId: instructor1._id },
    { defaultTemplateId: mbaTemplate._id, 'stats.totalTemplatesCreated': 2 }
  );

  // ── 4. GD Sessions ─────────────────────────────────────────────────────────
  const now = new Date();
  const yesterday  = new Date(now - 24 * 60 * 60 * 1000);
  const tomorrow   = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [completedSession, activeSession, scheduledSession, draftSession] = await GdSession.create([
    {
      title:           'MBA Batch 2024 — GD Round 1',
      description:     'First GD evaluation round for MBA 2024-26 batch',
      topic:           'Is remote work the future of corporate India?',
      instructorId:    instructor1._id,
      coInstructors:   [instructor2._id],
      templateId:      mbaTemplate._id,
      templateVersion: mbaTemplate.version,
      status:          SESSION_STATUS.COMPLETED,
      scheduledAt:     yesterday,
      startedAt:       yesterday,
      endedAt:         new Date(yesterday.getTime() + 40 * 60 * 1000),
      durationMins:    40,
      maxParticipants: 20,
      requiresPayment: false,
      participantCount: students.length,
      evaluatedCount:  students.length,
      tags:            ['batch-2024', 'round-1'],
    },
    {
      title:           'MBA Batch 2024 — GD Round 2 (Live)',
      description:     'Second GD round — currently in progress',
      topic:           'Should India adopt a four-day work week?',
      instructorId:    instructor1._id,
      templateId:      mbaTemplate._id,
      templateVersion: mbaTemplate.version,
      status:          SESSION_STATUS.ACTIVE,
      scheduledAt:     now,
      startedAt:       now,
      durationMins:    30,
      maxParticipants: 15,
      requiresPayment: false,
      participantCount: students.length,
      tags:            ['batch-2024', 'round-2'],
    },
    {
      title:           'MBA Batch 2024 — GD Round 3',
      description:     'Third GD round — practice session',
      topic:           'Impact of AI on white-collar jobs in India',
      instructorId:    instructor1._id,
      templateId:      mbaTemplate._id,
      templateVersion: mbaTemplate.version,
      status:          SESSION_STATUS.SCHEDULED,
      scheduledAt:     tomorrow,
      durationMins:    35,
      maxParticipants: 20,
      requiresPayment: true,
      sessionFee:      { amount: 500, currency: 'INR' },
      tags:            ['batch-2024', 'round-3'],
    },
    {
      title:           'Quick Practice — Communication Skills',
      description:     'Informal practice GD for communication improvement',
      instructorId:    instructor2._id,
      templateId:      quickTemplate._id,
      templateVersion: quickTemplate.version,
      status:          SESSION_STATUS.DRAFT,
      scheduledAt:     nextWeek,
      durationMins:    20,
      maxParticipants: 10,
      requiresPayment: false,
      tags:            ['practice'],
    },
  ]);
  logger.info('Created 4 GD sessions');

  // ── 5. Session Participants ────────────────────────────────────────────────
  const participantDocs = [];
  for (const session of [completedSession, activeSession, scheduledSession]) {
    for (const student of students) {
      participantDocs.push({
        sessionId:    session._id,
        studentId:    student._id,
        status:       session.status === SESSION_STATUS.COMPLETED
                        ? PARTICIPANT_STATUS.ATTENDED
                        : PARTICIPANT_STATUS.REGISTERED,
        isPaid:       session.requiresPayment ? false : true,
        invitedAt:    new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        registeredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      });
    }
  }
  await SessionParticipant.insertMany(participantDocs);
  logger.info(`Created ${participantDocs.length} session participants`);

  // ── 6. Evaluation Records (for completed session) ─────────────────────────
  const evalRecords = [];

  // Sample scores per student (varied for realistic data)
  const sampleScores = [
    { communication: 8, content_knowledge: 7, leadership: 9, listening: 8, body_language: 'Excellent', entry_quality: 'Strong opener', is_dominant: false, comments: 'Very articulate. Strong leader.' },
    { communication: 7, content_knowledge: 8, leadership: 6, listening: 9, body_language: 'Good',      entry_quality: 'Good mid-entry', is_dominant: false, comments: 'Great content, needs more assertiveness.' },
    { communication: 6, content_knowledge: 6, leadership: 7, listening: 6, body_language: 'Average',   entry_quality: 'Weak entry',     is_dominant: true,  comments: 'Tends to cut off others. Needs polish.' },
    { communication: 9, content_knowledge: 9, leadership: 8, listening: 8, body_language: 'Excellent', entry_quality: 'Strong opener',  is_dominant: false, comments: 'Outstanding performance across the board.' },
    { communication: 5, content_knowledge: 7, leadership: 5, listening: 7, body_language: 'Good',      entry_quality: 'Good mid-entry', is_dominant: false, comments: 'Good content but shy. Encourage more participation.' },
  ];

  for (let i = 0; i < students.length; i++) {
    const scores  = sampleScores[i];
    const baseTime = new Date(yesterday.getTime() + 10 * 60 * 1000 + i * 30_000);

    const fieldValues = [
      { fieldId: 'communication',    value: scores.communication,    scoredAt: baseTime },
      { fieldId: 'content_knowledge',value: scores.content_knowledge,scoredAt: new Date(baseTime.getTime() + 5000) },
      { fieldId: 'leadership',        value: scores.leadership,       scoredAt: new Date(baseTime.getTime() + 10000) },
      { fieldId: 'listening',         value: scores.listening,        scoredAt: new Date(baseTime.getTime() + 15000) },
      { fieldId: 'body_language',     value: scores.body_language,    scoredAt: new Date(baseTime.getTime() + 20000) },
      { fieldId: 'entry_quality',     value: scores.entry_quality,    scoredAt: new Date(baseTime.getTime() + 25000) },
      { fieldId: 'is_dominant',       value: scores.is_dominant,      scoredAt: new Date(baseTime.getTime() + 30000) },
      { fieldId: 'comments',          value: scores.comments,         scoredAt: new Date(baseTime.getTime() + 35000) },
    ];

    // Compute score manually for seed
    const totalScore = scores.communication * 2 + scores.content_knowledge * 2
                     + scores.leadership + scores.listening;
    const maxScore   = 10 * 2 + 10 * 2 + 10 + 10; // 60

    evalRecords.push({
      sessionId:      completedSession._id,
      studentId:      students[i]._id,
      instructorId:   instructor1._id,
      templateId:     mbaTemplate._id,
      templateVersion: mbaTemplate.version,
      status:         EVALUATION_STATUS.PUBLISHED,
      fieldValues,
      totalScore,
      maxScore,
      percentScore:   parseFloat(((totalScore / maxScore) * 100).toFixed(2)),
      calculatedAt:   yesterday,
      lastUpdatedAt:  yesterday,
      submittedAt:    yesterday,
      publishedAt:    yesterday,
      overallComment: scores.comments,
      version:        1,
    });
  }

  // Active session: draft records for live evaluation
  for (const student of students) {
    evalRecords.push({
      sessionId:      activeSession._id,
      studentId:      student._id,
      instructorId:   instructor1._id,
      templateId:     mbaTemplate._id,
      templateVersion: mbaTemplate.version,
      status:         EVALUATION_STATUS.DRAFT,
      fieldValues:    [],
      version:        0,
    });
  }

  await EvaluationRecord.insertMany(evalRecords);
  logger.info(`Created ${evalRecords.length} evaluation records`);

  // ── 7. Notifications ──────────────────────────────────────────────────────
  const notifications = [];

  // Results published notifications for completed session
  for (const student of students) {
    notifications.push({
      userId:  student._id,
      type:    NOTIFICATION_TYPES.RESULTS_PUBLISHED,
      title:   'Your GD results are ready',
      message: `Your evaluation for "${completedSession.title}" has been published.`,
      data:    { sessionId: completedSession._id, sessionTitle: completedSession.title },
      isRead:  false,
    });
  }

  // Session invite notifications
  for (const student of students) {
    notifications.push({
      userId:  student._id,
      type:    NOTIFICATION_TYPES.SESSION_INVITE,
      title:   'New GD session invitation',
      message: `You've been invited to: ${scheduledSession.title}`,
      data:    { sessionId: scheduledSession._id, sessionTitle: scheduledSession.title },
      isRead:  false,
    });
  }

  await Notification.insertMany(notifications);
  logger.info(`Created ${notifications.length} notifications`);

  // ── 8. Sample payment (for scheduled session) ─────────────────────────────
  await Payment.create({
    userId:    students[0]._id,
    sessionId: scheduledSession._id,
    provider:  'razorpay',
    status:    PAYMENT_STATUS.PAID,
    amount:    50000, // ₹500 in paise
    currency:  'INR',
    paidAt:    new Date(),
    razorpay: {
      orderId:   'order_seed_demo_001',
      paymentId: 'pay_seed_demo_001',
      signature: 'seed_signature_placeholder',
    },
  });
  logger.info('Created 1 sample payment');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(56));
  console.log('  ✅  Seed complete — Demo credentials');
  console.log('═'.repeat(56));
  console.log(`  ADMIN       ${ADMIN_EMAIL}`);
  console.log(`  INSTRUCTOR  ${INSTRUCTOR_EMAIL}`);
  console.log(`  INSTRUCTOR  ${INSTRUCTOR2_EMAIL}`);
  STUDENT_EMAILS.forEach((e) => console.log(`  STUDENT     ${e}`));
  console.log(`\n  Password (all accounts): ${DEMO_PASSWORD}`);
  console.log('═'.repeat(56) + '\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
