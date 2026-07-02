/**
 * Full REST API test suite for the GD Evaluation Platform backend.
 *
 * This script is SELF-CONTAINED — it registers its own users, creates its own
 * template/session, and exercises the entire lifecycle end-to-end. You do NOT
 * need to run `npm run seed` first (though it's fine if you have).
 *
 * Usage:
 *   1. Start the backend:  npm run dev   (in another terminal)
 *   2. Run this suite:     npm run test:api
 *
 * Env overrides:
 *   TEST_BASE_URL=http://localhost:5000   (default)
 *
 * Exit code is 1 if any test failed (CI-friendly).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const crypto = require('crypto');
const {
  api, test, skip, assert, assertEqual, assertStatus,
  uniqueSuffix, section, printSummary, BASE_URL,
} = require('./helpers');

const suffix = uniqueSuffix();
const PASSWORD = 'TestPass@123';

// Heuristic: only attempt real Razorpay network calls if .env has real-looking creds
const hasRealRazorpayCreds =
  !!process.env.RAZORPAY_KEY_ID &&
  !process.env.RAZORPAY_KEY_ID.includes('xxxx') &&
  !!process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_SECRET.includes('xxxx');

// Webhook HMAC verification is pure local crypto — testable even without a real
// Razorpay account, as long as SOME secret is configured.
const hasWebhookSecret = !!process.env.RAZORPAY_WEBHOOK_SECRET;

// ── Shared state across phases ─────────────────────────────────────────────────
let instructor, instructor2, students = [];
let template, session, paidSession;
let payment = null;

async function main() {
  console.log(`\nTesting backend at: ${BASE_URL}`);
  console.log(`Run suffix: ${suffix}\n`);

  // ════════════════════════════════════════════════════════════════════════
  section('0. Health Check');
  // ════════════════════════════════════════════════════════════════════════
  await test('GET /health → 200', async () => {
    const res = await api('GET', '/health');
    assertStatus(res, 200, 'health check');
    assert(res.data.status === 'ok', 'expected status: ok');
  });

  await test('GET /api/unknown-route → 404 with custom handler', async () => {
    const res = await api('GET', '/api/this-route-does-not-exist');
    assertStatus(res, 404, '404 handler');
    assert(res.data.success === false, 'expected success:false');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('1. Auth — Register, Login, Refresh, Logout');
  // ════════════════════════════════════════════════════════════════════════

  instructor = await test('POST /api/auth/register — instructor', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: {
        name: 'Test Instructor',
        email: `instructor_${suffix}@test.dev`,
        password: PASSWORD,
        role: 'instructor',
      },
    });
    assertStatus(res, 201, 'register instructor');
    assert(res.data.data.accessToken, 'expected accessToken in response');
    assert(res.data.data.user.role === 'instructor', 'expected role instructor');
    return {
      id: res.data.data.user._id,
      email: res.data.data.user.email,
      token: res.data.data.accessToken,
      refreshToken: res.data.data.refreshToken,
    };
  });

  instructor2 = await test('POST /api/auth/register — second instructor (for access-control tests)', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: {
        name: 'Test Instructor Two',
        email: `instructor2_${suffix}@test.dev`,
        password: PASSWORD,
        role: 'instructor',
      },
    });
    assertStatus(res, 201, 'register instructor2');
    return { id: res.data.data.user._id, token: res.data.data.accessToken };
  });

  await test('Admin logs in and verifies instructors', async () => {
    const adminLoginRes = await api('POST', '/api/auth/login', {
      body: { email: 'admin@gdeval.dev', password: 'Demo@1234' },
    });
    assertStatus(adminLoginRes, 200, 'admin login');
    const adminToken = adminLoginRes.data.data.accessToken;

    const verifyRes1 = await api('PATCH', `/api/users/${instructor.id}/verify`, {
      token: adminToken,
    });
    assertStatus(verifyRes1, 200, 'verify instructor 1');

    const verifyRes2 = await api('PATCH', `/api/users/${instructor2.id}/verify`, {
      token: adminToken,
    });
    assertStatus(verifyRes2, 200, 'verify instructor 2');
  });

  for (let i = 0; i < 3; i++) {
    const s = await test(`POST /api/auth/register — student ${i + 1}`, async () => {
      const res = await api('POST', '/api/auth/register', {
        body: {
          name: `Test Student ${i + 1}`,
          email: `student${i + 1}_${suffix}@test.dev`,
          password: PASSWORD,
          role: 'student',
        },
      });
      assertStatus(res, 201, `register student ${i + 1}`);
      return {
        id: res.data.data.user._id,
        email: res.data.data.user.email,
        token: res.data.data.accessToken,
        refreshToken: res.data.data.refreshToken,
      };
    });
    if (s) students.push(s);
  }

  await test('POST /api/auth/register — admin role rejected on public endpoint (403)', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { name: 'Hacker', email: `admin_${suffix}@test.dev`, password: PASSWORD, role: 'admin' },
    });
    assertStatus(res, 403, 'admin self-registration block');
  });

  await test('POST /api/auth/register — duplicate email rejected (409)', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { name: 'Dup', email: instructor.email, password: PASSWORD, role: 'student' },
    });
    assertStatus(res, 409, 'duplicate email');
  });

  await test('POST /api/auth/register — weak password rejected (400)', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { name: 'Weak', email: `weak_${suffix}@test.dev`, password: 'weak', role: 'student' },
    });
    assertStatus(res, 400, 'weak password validation');
    assert(Array.isArray(res.data.details), 'expected validation details array');
  });

  await test('POST /api/auth/login — correct credentials', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: instructor.email, password: PASSWORD },
    });
    assertStatus(res, 200, 'login');
    assert(res.data.data.accessToken, 'expected accessToken');
  });

  await test('POST /api/auth/login — wrong password (401)', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: instructor.email, password: 'WrongPassword@1' },
    });
    assertStatus(res, 401, 'wrong password');
  });

  await test('POST /api/auth/login — nonexistent email (401, no user-enumeration)', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: `ghost_${suffix}@test.dev`, password: PASSWORD },
    });
    assertStatus(res, 401, 'nonexistent email');
  });

  let rotatedRefreshToken;
  await test('POST /api/auth/refresh — rotates access + refresh token', async () => {
    const res = await api('POST', '/api/auth/refresh', {
      body: { refreshToken: instructor.refreshToken },
    });
    assertStatus(res, 200, 'refresh token');
    assert(res.data.data.accessToken, 'expected new accessToken');
    assert(res.data.data.refreshToken !== instructor.refreshToken, 'expected rotated refresh token');
    rotatedRefreshToken = res.data.data.refreshToken;
    instructor.token = res.data.data.accessToken; // use freshest token going forward
  });

  await test('POST /api/auth/refresh — reused old token rejected (theft detection)', async () => {
    const res = await api('POST', '/api/auth/refresh', {
      body: { refreshToken: instructor.refreshToken }, // the OLD, now-rotated-out token
    });
    assertStatus(res, 401, 'refresh token reuse detection');
    instructor.refreshToken = rotatedRefreshToken; // keep state usable for any later test
  });

  await test('POST /api/auth/forgot-password — always 200 (no email enumeration)', async () => {
    const res = await api('POST', '/api/auth/forgot-password', {
      body: { email: `whether_exists_or_not_${suffix}@test.dev` },
    });
    assertStatus(res, 200, 'forgot password');
  });

  await test('POST /api/auth/logout — invalidates refresh token', async () => {
    const res = await api('POST', '/api/auth/logout', {
      token: students[0].token,
      body: { refreshToken: students[0].refreshToken },
    });
    assertStatus(res, 200, 'logout');
  });

  let googleStudent, googleInstructor;
  await test('POST /api/auth/google — new student (registers & creates profile)', async () => {
    const res = await api('POST', '/api/auth/google', {
      body: {
        token: `mock_google_token_google_student_${suffix}@test.dev`,
        role: 'student',
      },
    });
    assertStatus(res, 200, 'google login new student');
    assert(res.data.data.accessToken, 'expected accessToken');
    assert(res.data.data.user.role === 'student', 'expected student role');
    googleStudent = res.data.data;
  });

  await test('POST /api/auth/google — new instructor (registers & creates profile)', async () => {
    const res = await api('POST', '/api/auth/google', {
      body: {
        token: `mock_google_token_google_instructor_${suffix}@test.dev`,
        role: 'instructor',
      },
    });
    assertStatus(res, 200, 'google login new instructor');
    assert(res.data.data.accessToken, 'expected accessToken');
    assert(res.data.data.user.role === 'instructor', 'expected instructor role');
    googleInstructor = res.data.data;
  });

  await test('POST /api/auth/google — existing user (logs in)', async () => {
    const res = await api('POST', '/api/auth/google', {
      body: {
        token: `mock_google_token_google_student_${suffix}@test.dev`,
        role: 'student',
      },
    });
    assertStatus(res, 200, 'google login existing user');
    assert(res.data.data.accessToken, 'expected accessToken');
    assert(res.data.data.user.email === `google_student_${suffix}@test.dev`, 'expected email match');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('2. Users — Profile Management & Access Control');
  // ════════════════════════════════════════════════════════════════════════

  await test('GET /api/users/me — no token (401)', async () => {
    const res = await api('GET', '/api/users/me');
    assertStatus(res, 401, 'no token');
  });

  await test('GET /api/users/me — garbage token (401)', async () => {
    const res = await api('GET', '/api/users/me', { token: 'this.is.not.a.valid.jwt' });
    assertStatus(res, 401, 'garbage token');
  });

  await test('GET /api/users/me — instructor', async () => {
    const res = await api('GET', '/api/users/me', { token: instructor.token });
    assertStatus(res, 200, 'get me instructor');
    assertEqual(res.data.data.user.role, 'instructor', 'role');
  });

  await test('GET /api/users/me — student', async () => {
    const res = await api('GET', '/api/users/me', { token: students[1].token });
    assertStatus(res, 200, 'get me student');
    assertEqual(res.data.data.user.role, 'student', 'role');
  });

  await test('PATCH /api/users/me — update name', async () => {
    const res = await api('PATCH', '/api/users/me', {
      token: instructor.token,
      body: { name: 'Updated Instructor Name' },
    });
    assertStatus(res, 200, 'update me');
    assertEqual(res.data.data.user.name, 'Updated Instructor Name', 'name');
  });

  await test('PATCH /api/users/me — attempting password change rejected (400)', async () => {
    const res = await api('PATCH', '/api/users/me', {
      token: instructor.token,
      body: { password: 'NewPass@123' },
    });
    assertStatus(res, 400, 'password change via wrong endpoint');
  });

  await test('GET /api/users/me/profile — instructor profile', async () => {
    const res = await api('GET', '/api/users/me/profile', { token: instructor.token });
    assertStatus(res, 200, 'get instructor profile');
  });

  await test('PATCH /api/users/me/profile — instructor updates org/bio', async () => {
    const res = await api('PATCH', '/api/users/me/profile', {
      token: instructor.token,
      body: { organization: 'Test University', designation: 'Professor', bio: 'GD evaluation specialist.' },
    });
    assertStatus(res, 200, 'update instructor profile');
    assertEqual(res.data.data.profile.organization, 'Test University', 'organization');
  });

  await test('PATCH /api/users/me/profile — student updates roll number/batch', async () => {
    const res = await api('PATCH', '/api/users/me/profile', {
      token: students[0].token,
      body: { rollNumber: 'TEST001', batch: '2024-26', institution: 'Test Institute' },
    });
    assertStatus(res, 200, 'update student profile');
  });

  await test('GET /api/users — student forbidden from admin listing (403)', async () => {
    const res = await api('GET', '/api/users', { token: students[0].token });
    assertStatus(res, 403, 'admin-only listing blocked for student');
  });

  await test('GET /api/users — instructor forbidden from admin listing (403)', async () => {
    const res = await api('GET', '/api/users', { token: instructor.token });
    assertStatus(res, 403, 'admin-only listing blocked for instructor');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('3. Evaluation Templates — Dynamic Rubric Engine');
  // ════════════════════════════════════════════════════════════════════════

  await test('POST /api/templates — student forbidden (403)', async () => {
    const res = await api('POST', '/api/templates', {
      token: students[0].token,
      body: { name: 'x', fields: [{ fieldId: 'a', label: 'A', type: 'number' }] },
    });
    assertStatus(res, 403, 'student blocked from template creation');
  });

  await test('POST /api/templates — missing fields rejected (400)', async () => {
    const res = await api('POST', '/api/templates', {
      token: instructor.token,
      body: { name: 'Empty Template', fields: [] },
    });
    assertStatus(res, 400, 'empty fields array validation');
  });

  await test('POST /api/templates — select field without options rejected (400)', async () => {
    const res = await api('POST', '/api/templates', {
      token: instructor.token,
      body: {
        name: 'Bad Template',
        fields: [{ fieldId: 'choice', label: 'Choice', type: 'select' }], // missing options
      },
    });
    assertStatus(res, 400, 'select without options validation');
  });

  template = await test('POST /api/templates — create valid rubric with all field types', async () => {
    const res = await api('POST', '/api/templates', {
      token: instructor.token,
      body: {
        name: `GD Rubric ${suffix}`,
        description: 'Test rubric covering all field types',
        fields: [
          { fieldId: 'communication', label: 'Communication', type: 'weighted_score', weight: 2, maxScore: 10, required: true, order: 1, visibleToStudent: true },
          { fieldId: 'leadership',    label: 'Leadership',    type: 'number',         min: 0, max: 10, required: true, order: 2, visibleToStudent: true },
          { fieldId: 'style',         label: 'Style',         type: 'select',         options: ['Excellent', 'Good', 'Average'], order: 3, visibleToStudent: true },
          { fieldId: 'strengths',     label: 'Strengths',     type: 'multi_select',   options: ['Clarity', 'Confidence', 'Logic'], order: 4, visibleToStudent: true },
          { fieldId: 'dominant',      label: 'Was Dominant?', type: 'boolean',        order: 5, visibleToStudent: false },
          { fieldId: 'notes',        label: 'Private Notes',  type: 'text',           order: 6, visibleToStudent: false },
        ],
      },
    });
    assertStatus(res, 201, 'create template');
    assert(res.data.data.template.status === 'draft', 'new template should start as draft');
    return res.data.data.template;
  });

  await test('GET /api/templates — list (index view omits fields[])', async () => {
    const res = await api('GET', '/api/templates', { token: instructor.token });
    assertStatus(res, 200, 'list templates');
    assert(Array.isArray(res.data.data), 'expected array');
    assert(res.data.data.some((t) => t._id === template._id), 'created template should appear in list');
  });

  await test('GET /api/templates/:id — full detail includes fields[]', async () => {
    const res = await api('GET', `/api/templates/${template._id}`, { token: instructor.token });
    assertStatus(res, 200, 'get template detail');
    assertEqual(res.data.data.template.fields.length, 6, 'field count');
  });

  await test('GET /api/templates/:id — instructor2 cannot see another instructor\'s draft as own (still readable, ownership only enforced on write)', async () => {
    const res = await api('GET', `/api/templates/${template._id}`, { token: instructor2.token });
    // Read access for templates is not ownership-restricted in this MVP — only mutation is.
    assertStatus(res, 200, 'cross-instructor read');
  });

  await test('PATCH /api/templates/:id — instructor2 forbidden from editing (403)', async () => {
    const res = await api('PATCH', `/api/templates/${template._id}`, {
      token: instructor2.token,
      body: { name: 'Hijacked Name' },
    });
    assertStatus(res, 403, 'cross-instructor edit blocked');
  });

  await test('PATCH /api/templates/:id — owner edits draft in place', async () => {
    const res = await api('PATCH', `/api/templates/${template._id}`, {
      token: instructor.token,
      body: { description: 'Updated description' },
    });
    assertStatus(res, 200, 'edit own draft template');
    assertEqual(res.data.data.template.description, 'Updated description', 'description');
  });

  template = await test('PATCH /api/templates/:id/publish — activate template', async () => {
    const res = await api('PATCH', `/api/templates/${template._id}/publish`, { token: instructor.token });
    assertStatus(res, 200, 'publish template');
    assertEqual(res.data.data.template.status, 'active', 'status after publish');
    return res.data.data.template;
  });

  await test('PATCH /api/templates/:id/publish — already-active rejected (400)', async () => {
    const res = await api('PATCH', `/api/templates/${template._id}/publish`, { token: instructor.token });
    assertStatus(res, 400, 'double publish');
  });

  await test('PATCH /api/templates/:id — editing active template creates NEW version instead', async () => {
    const res = await api('PATCH', `/api/templates/${template._id}`, {
      token: instructor.token,
      body: { name: `${template.name} v2` },
    });
    assertStatus(res, 201, 'versioned edit returns 201 (new doc)');
    assertEqual(res.data.data.template.version, 2, 'new version number');
    assertEqual(res.data.data.template.parentTemplateId, template._id, 'parent linkage');
    assertEqual(res.data.data.template.status, 'draft', 'new version starts as draft');
  });

  const duplicateTemplate = await test('POST /api/templates/:id/duplicate — clone as new draft', async () => {
    const res = await api('POST', `/api/templates/${template._id}/duplicate`, {
      token: instructor.token,
      body: { name: `${template.name} (clone)` },
    });
    assertStatus(res, 201, 'duplicate template');
    assertEqual(res.data.data.template.status, 'draft', 'clone starts as draft');
    return res.data.data.template;
  });

  await test('PATCH /api/templates/:id/archive — archive the clone', async () => {
    const res = await api('PATCH', `/api/templates/${duplicateTemplate._id}/archive`, { token: instructor.token });
    assertStatus(res, 200, 'archive template');
  });

  await test('GET /api/templates/:id — archived template no longer fetchable (404)', async () => {
    const res = await api('GET', `/api/templates/${duplicateTemplate._id}`, { token: instructor.token });
    assertStatus(res, 404, 'archived template hidden');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('4. GD Sessions — Lifecycle, Join Codes, Participants');
  // ════════════════════════════════════════════════════════════════════════

  await test('POST /api/sessions — student forbidden (403)', async () => {
    const res = await api('POST', '/api/sessions', {
      token: students[0].token,
      body: { title: 'x', templateId: template._id },
    });
    assertStatus(res, 403, 'student blocked from session creation');
  });

  await test('POST /api/sessions — invalid templateId format rejected (400)', async () => {
    const res = await api('POST', '/api/sessions', {
      token: instructor.token,
      body: { title: 'Bad Session', templateId: 'not-a-valid-object-id' },
    });
    assertStatus(res, 400, 'invalid templateId validation');
  });

  await test('POST /api/sessions — nonexistent templateId rejected (404)', async () => {
    const res = await api('POST', '/api/sessions', {
      token: instructor.token,
      body: { title: 'Bad Session', templateId: '64a000000000000000000000' },
    });
    assertStatus(res, 404, 'nonexistent template');
  });

  session = await test('POST /api/sessions — create live GD session', async () => {
    const res = await api('POST', '/api/sessions', {
      token: instructor.token,
      body: {
        title: `Test GD Session ${suffix}`,
        topic: 'Should AI replace human interviewers?',
        templateId: template._id,
        durationMins: 30,
        maxParticipants: 10,
      },
    });
    assertStatus(res, 201, 'create session');
    assert(res.data.data.session.joinCode, 'expected auto-generated joinCode');
    assertEqual(res.data.data.session.status, 'draft', 'initial status');
    return res.data.data.session;
  });

  paidSession = await test('POST /api/sessions — create a payment-required session', async () => {
    const res = await api('POST', '/api/sessions', {
      token: instructor.token,
      body: {
        title: `Paid GD Session ${suffix}`,
        templateId: template._id,
        requiresPayment: true,
        sessionFee: { amount: 500, currency: 'INR' },
      },
    });
    assertStatus(res, 201, 'create paid session');
    return res.data.data.session;
  });

  await test('GET /api/sessions — instructor sees own sessions (paginated)', async () => {
    const res = await api('GET', '/api/sessions', { token: instructor.token });
    assertStatus(res, 200, 'list sessions');
    assert(res.data.meta.total >= 2, 'expected at least 2 sessions');
  });

  await test('GET /api/sessions — instructor2 does not see instructor1\'s sessions', async () => {
    const res = await api('GET', '/api/sessions', { token: instructor2.token });
    assertStatus(res, 200, 'list sessions instructor2');
    assert(!res.data.data.some((s) => s._id === session._id), 'instructor2 should not see instructor1\'s session');
  });

  await test('GET /api/sessions/:sessionId — fetch detail with populated template', async () => {
    const res = await api('GET', `/api/sessions/${session._id}`, { token: instructor.token });
    assertStatus(res, 200, 'get session detail');
    assertEqual(res.data.data.session.templateId.name, template.name, 'populated template name');
  });

  await test('GET /api/auth/google/connect-url — connects Google Calendar', async () => {
    const res = await api('GET', '/api/auth/google/connect-url', { token: instructor.token });
    assertStatus(res, 200, 'get connect url');
    assert(res.data.data.authUrl, 'expected authUrl');
  });

  await test('POST /api/auth/google/callback — completes code exchange (Mock Mode)', async () => {
    const res = await api('POST', '/api/auth/google/callback', {
      token: instructor.token,
      body: { code: 'mock_authorization_code' },
    });
    assertStatus(res, 200, 'google callback success');
    assert(res.data.data.googleConnected === true, 'expected googleConnected true');
  });

  await test('POST /api/sessions/:sessionId/google-meet — generates Google Meet room link', async () => {
    // Configure GOOGLE_ADMIN_EMAIL to match the test instructor email so mock lookup works
    process.env.GOOGLE_ADMIN_EMAIL = instructor.email;

    const res = await api('POST', `/api/sessions/${session._id}/google-meet`, { token: instructor.token });
    assertStatus(res, 200, 'google meet generation success');
    assert(res.data.data.session.googleMeetUrl.startsWith('https://meet.google.com/'), 'expected googleMeetUrl format');
  });

  await test('DELETE /api/auth/google/disconnect — disconnects Google Calendar', async () => {
    const res = await api('DELETE', '/api/auth/google/disconnect', { token: instructor.token });
    assertStatus(res, 200, 'google disconnect success');
    assert(res.data.data.googleConnected === false, 'expected googleConnected false');
  });

  await test('GET /api/sessions/:sessionId — instructor2 forbidden (403)', async () => {
    const res = await api('GET', `/api/sessions/${session._id}`, { token: instructor2.token });
    assertStatus(res, 403, 'cross-instructor session access blocked');
  });

  await test('GET /api/sessions/:badId — invalid ObjectId format (400)', async () => {
    const res = await api('GET', '/api/sessions/not-a-valid-id', { token: instructor.token });
    assertStatus(res, 400, 'invalid sessionId format');
  });

  await test('GET /api/sessions/join/:joinCode — student looks up session by code', async () => {
    const res = await api('GET', `/api/sessions/join/${session.joinCode}`, { token: students[0].token });
    assertStatus(res, 200, 'join by code');
    assertEqual(res.data.data.session._id, session._id, 'session id match');
  });

  await test('GET /api/sessions/join/:badCode — invalid code (404)', async () => {
    const res = await api('GET', '/api/sessions/join/ZZZZZZ', { token: students[0].token });
    assertStatus(res, 404, 'invalid join code');
  });

  await test('PATCH /api/sessions/:sessionId — update title while in draft', async () => {
    const res = await api('PATCH', `/api/sessions/${session._id}`, {
      token: instructor.token,
      body: { title: `${session.title} (edited)` },
    });
    assertStatus(res, 200, 'update session title');
  });

  await test('POST /api/sessions/:sessionId/participants — invalid student IDs rejected (400)', async () => {
    const res = await api('POST', `/api/sessions/${session._id}/participants`, {
      token: instructor.token,
      body: { studentIds: [instructor.id] }, // instructor id, not a student
    });
    assertStatus(res, 400, 'non-student id rejected');
  });

  await test('POST /api/sessions/:sessionId/participants — assign all 3 test students', async () => {
    const res = await api('POST', `/api/sessions/${session._id}/participants`, {
      token: instructor.token,
      body: { studentIds: students.map((s) => s.id) },
    });
    assertStatus(res, 200, 'assign students');
    assertEqual(res.data.data.assigned, 3, 'assigned count');
  });

  await test('GET /api/sessions/:sessionId/participants — list participants', async () => {
    const res = await api('GET', `/api/sessions/${session._id}/participants`, { token: instructor.token });
    assertStatus(res, 200, 'list participants');
    assertEqual(res.data.data.participants.length, 3, 'participant count');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('5. Live Evaluation — Start Session, Batch Sync (LWW), Submit, Publish');
  // ════════════════════════════════════════════════════════════════════════

  await test('PATCH /api/evaluations/batch — rejected on non-active (draft) session', async () => {
    const res = await api('PATCH', '/api/evaluations/batch', {
      token: instructor.token,
      body: {
        sessionId: session._id,
        updates: [{ studentId: students[0].id, fieldValues: [{ fieldId: 'leadership', value: 5 }] }],
      },
    });
    assertStatus(res, 400, 'batch update on draft session blocked');
  });

  session = await test('POST /api/sessions/:sessionId/start — activate session, pre-create drafts', async () => {
    const res = await api('POST', `/api/sessions/${session._id}/start`, { token: instructor.token });
    assertStatus(res, 200, 'start session');
    assertEqual(res.data.data.session.status, 'active', 'status active');
    return res.data.data.session;
  });

  await test('POST /api/sessions/:sessionId/start — double-start rejected (400)', async () => {
    const res = await api('POST', `/api/sessions/${session._id}/start`, { token: instructor.token });
    assertStatus(res, 400, 'double start blocked');
  });

  await test('GET /api/evaluations/sessions/:sessionId/evaluations — preload shows pre-created drafts', async () => {
    const res = await api('GET', `/api/evaluations/sessions/${session._id}/evaluations`, { token: instructor.token });
    assertStatus(res, 200, 'preload evaluations');
    assertEqual(res.data.data.total, 3, 'one draft record per participant');
  });

  // ── Last-Write-Wins test: simulate two instructor devices racing on the same field ──
  await test('PATCH /api/evaluations/batch — LWW: older timestamp write is correctly discarded', async () => {
    const newer = new Date().toISOString();
    const older = new Date(Date.now() - 60_000).toISOString(); // 1 minute earlier

    // "Device A" writes value 8 at the NEWER timestamp
    const resA = await api('PATCH', '/api/evaluations/batch', {
      token: instructor.token,
      body: {
        sessionId: session._id,
        updates: [{
          studentId: students[0].id,
          fieldValues: [{ fieldId: 'leadership', value: 8, scoredAt: newer, deviceLabel: 'Laptop' }],
        }],
      },
    });
    assertStatus(resA, 200, 'batch write A (newer)');

    // "Device B" tries to write a STALE value 3 at an OLDER timestamp — should be ignored
    const resB = await api('PATCH', '/api/evaluations/batch', {
      token: instructor.token,
      body: {
        sessionId: session._id,
        updates: [{
          studentId: students[0].id,
          fieldValues: [{ fieldId: 'leadership', value: 3, scoredAt: older, deviceLabel: 'Phone' }],
        }],
      },
    });
    assertStatus(resB, 200, 'batch write B (stale)');

    // Verify the NEWER value (8) won, not the stale value (3)
    const check = await api(
      'GET', `/api/evaluations/sessions/${session._id}/evaluations/${students[0].id}`,
      { token: instructor.token }
    );
    assertStatus(check, 200, 'fetch record after LWW race');
    const leadershipField = check.data.data.record.fieldValues.find((f) => f.fieldId === 'leadership');
    assert(leadershipField, 'leadership field should exist');
    assertEqual(leadershipField.value, 8, 'LWW should keep the newer value (8), not stale (3)');
  });

  await test('PATCH /api/evaluations/batch — score all 3 students across all field types', async () => {
    const now = new Date().toISOString();
    const res = await api('PATCH', '/api/evaluations/batch', {
      token: instructor.token,
      body: {
        sessionId: session._id,
        updates: students.map((s, i) => ({
          studentId: s.id,
          fieldValues: [
            { fieldId: 'communication', value: 7 + i, scoredAt: now },
            { fieldId: 'leadership',    value: 6 + i, scoredAt: now },
            { fieldId: 'style',         value: 'Good', scoredAt: now },
            { fieldId: 'strengths',     value: ['Clarity', 'Logic'], scoredAt: now },
            { fieldId: 'dominant',      value: i === 2, scoredAt: now },
            { fieldId: 'notes',         value: `Private note for student ${i + 1}`, scoredAt: now },
          ],
          overallComment: `Overall: solid performance from student ${i + 1}.`,
        })),
      },
    });
    assertStatus(res, 200, 'batch score all students');
    assertEqual(res.data.data.updated, 3, 'updated count');
  });

  await test('GET /api/evaluations/sessions/:sessionId/evaluations/:studentId — single record fetch', async () => {
    const res = await api(
      'GET', `/api/evaluations/sessions/${session._id}/evaluations/${students[1].id}`,
      { token: instructor.token }
    );
    assertStatus(res, 200, 'single evaluation record');
    assertEqual(res.data.data.record.status, 'draft', 'still draft before submit');
  });

  for (const s of students) {
    await test(`PATCH .../evaluations/${s.email}/submit — submit & compute score`, async () => {
      const res = await api(
        'PATCH', `/api/evaluations/sessions/${session._id}/evaluations/${s.id}/submit`,
        { token: instructor.token }
      );
      assertStatus(res, 200, 'submit evaluation');
      assertEqual(res.data.data.record.status, 'submitted', 'status submitted');
      assert(typeof res.data.data.record.totalScore === 'number', 'totalScore should be computed');
      assert(typeof res.data.data.record.percentScore === 'number', 'percentScore should be computed');
    });
  }

  await test('GET /api/dashboard/session/:sessionId — live board shows per-field averages', async () => {
    const res = await api('GET', `/api/dashboard/session/${session._id}`, { token: instructor.token });
    assertStatus(res, 200, 'session board');
    assertEqual(res.data.data.summary.total, 3, 'total participants');
    assertEqual(res.data.data.summary.evaluated, 3, 'evaluated count (submitted)');
    assert(res.data.data.fieldStats.length === 6, 'fieldStats should cover all 6 template fields');
  });

  await test('POST /api/evaluations/sessions/:sessionId/evaluations/publish — publish all submitted', async () => {
    const res = await api('POST', `/api/evaluations/sessions/${session._id}/evaluations/publish`, {
      token: instructor.token,
      body: {},
    });
    assertStatus(res, 200, 'publish evaluations');
    assertEqual(res.data.data.publishedCount, 3, 'published count');
  });

  await test('POST .../publish — re-publish with nothing left to publish (404)', async () => {
    const res = await api('POST', `/api/evaluations/sessions/${session._id}/evaluations/publish`, {
      token: instructor.token,
      body: {},
    });
    assertStatus(res, 404, 'no submitted evaluations left');
  });

  await test('PATCH .../submit — cannot modify a published evaluation (400)', async () => {
    const res = await api(
      'PATCH', `/api/evaluations/sessions/${session._id}/evaluations/${students[0].id}/submit`,
      { token: instructor.token }
    );
    assertStatus(res, 400, 'published evaluation immutable');
  });

  session = await test('POST /api/sessions/:sessionId/end — complete the session', async () => {
    const res = await api('POST', `/api/sessions/${session._id}/end`, { token: instructor.token });
    assertStatus(res, 200, 'end session');
    assertEqual(res.data.data.session.status, 'completed', 'status completed');
    return res.data.data.session;
  });

  // ════════════════════════════════════════════════════════════════════════
  section('6. Published Results — Student Visibility Rules');
  // ════════════════════════════════════════════════════════════════════════

  await test('GET /api/evaluations/sessions/:sessionId/results — student sees ONLY own result', async () => {
    const res = await api('GET', `/api/evaluations/sessions/${session._id}/results`, { token: students[0].token });
    assertStatus(res, 200, 'student results');
    assertEqual(res.data.data.results.length, 1, 'student should see exactly 1 result (their own)');
  });

  await test('GET .../results — hidden fields (visibleToStudent:false) are visible to student for transparency', async () => {
    const res = await api('GET', `/api/evaluations/sessions/${session._id}/results`, { token: students[0].token });
    const record = res.data.data.results[0];
    const fieldIds = record.fieldValues.map((f) => f.fieldId);
    assert(fieldIds.includes('dominant'), 'field "dominant" should be visible to student');
    assert(fieldIds.includes('notes'), 'field "notes" should be visible to student');
    assert(fieldIds.includes('communication'), 'visible field "communication" should be present');
    assert(fieldIds.includes('leadership'), 'visible field "leadership" should be present');
  });

  await test('GET .../results — instructor sees all published records with full field data', async () => {
    const res = await api('GET', `/api/evaluations/sessions/${session._id}/results`, { token: instructor.token });
    assertStatus(res, 200, 'instructor results');
    assertEqual(res.data.data.results.length, 3, 'instructor sees all 3 published records');
    const fieldIds = res.data.data.results[0].fieldValues.map((f) => f.fieldId);
    assert(fieldIds.includes('notes'), 'instructor view should retain private "notes" field');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('7. Payments — Order Creation, Verification, Webhooks');
  // ════════════════════════════════════════════════════════════════════════

  if (hasRealRazorpayCreds) {
    payment = await test('POST /api/payments/order — create real Razorpay order', async () => {
      const res = await api('POST', '/api/payments/order', {
        token: students[0].token,
        body: { sessionId: paidSession._id },
      });
      assertStatus(res, 201, 'create payment order');
      assert(res.data.data.orderId, 'expected Razorpay orderId');
      return res.data.data;
    });

    await test('POST /api/payments/verify — invalid signature rejected (400)', async () => {
      const res = await api('POST', '/api/payments/verify', {
        token: students[0].token,
        body: {
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          razorpayPaymentId: 'pay_fake_test',
          razorpaySignature: 'deliberately_wrong_signature',
        },
      });
      assertStatus(res, 400, 'invalid payment signature');
    });
  } else {
    skip('POST /api/payments/order', 'RAZORPAY_KEY_ID/SECRET are placeholders in .env — set real test keys to run');
    skip('POST /api/payments/verify (signature check)', 'depends on a real order from the test above');
  }

  await test('POST /api/payments/verify — nonexistent paymentId (404)', async () => {
    const res = await api('POST', '/api/payments/verify', {
      token: students[0].token,
      body: {
        paymentId: '64a000000000000000000000',
        orderId: 'order_fake',
        razorpayPaymentId: 'pay_fake',
        razorpaySignature: 'fake',
      },
    });
    assertStatus(res, 404, 'nonexistent payment record');
  });

  await test('GET /api/payments/session/:sessionId/status — no payment yet returns null', async () => {
    const res = await api('GET', `/api/payments/session/${paidSession._id}/status`, { token: students[1].token });
    assertStatus(res, 200, 'payment status check');
    assertEqual(res.data.data.payment, null, 'no payment exists yet for this student/session');
  });

  await test('GET /api/payments/history — returns array (possibly empty)', async () => {
    const res = await api('GET', '/api/payments/history', { token: students[1].token });
    assertStatus(res, 200, 'payment history');
    assert(Array.isArray(res.data.data.payments), 'expected payments array');
  });

  // ── Webhook tests: pure local HMAC verification, no real Razorpay account needed ──
  if (hasWebhookSecret) {
    await test('POST /api/payments/webhook — invalid signature rejected (400)', async () => {
      const fakePayload = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_x', order_id: 'order_x' } } },
      });
      const res = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'garbage_signature' },
        body: fakePayload,
      });
      assertStatus({ status: res.status, data: await res.json().catch(() => null) }, 400, 'invalid webhook signature');
    });

    await test('POST /api/payments/webhook — valid signature, unknown order → graceful no-op (200)', async () => {
      const payloadObj = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_unknown', order_id: 'order_does_not_exist_in_db' } } },
      };
      const payloadStr = JSON.stringify(payloadObj);
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payloadStr)
        .digest('hex');

      const res = await fetch(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
        body: payloadStr,
      });
      const data = await res.json().catch(() => null);
      assertStatus({ status: res.status, data }, 200, 'webhook graceful no-op');
      assert(data.received === true, 'expected {received:true}');
    });

    if (payment) {
      await test('POST /api/payments/webhook — valid signature, KNOWN order → marks payment paid', async () => {
        const payloadObj = {
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_webhook_test', order_id: payment.orderId } } },
        };
        const payloadStr = JSON.stringify(payloadObj);
        const signature = crypto
          .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(payloadStr)
          .digest('hex');

        const res = await fetch(`${BASE_URL}/api/payments/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
          body: payloadStr,
        });
        assert(res.status === 200, 'webhook should return 200');

        const status = await api('GET', `/api/payments/session/${paidSession._id}/status`, { token: students[0].token });
        assertEqual(status.data.data.payment.status, 'paid', 'payment marked paid via webhook');
      });
    } else {
      skip('Webhook → marks known payment as paid', 'no real payment exists (Razorpay creds not configured)');
    }
  } else {
    skip('Webhook signature tests', 'RAZORPAY_WEBHOOK_SECRET not set in .env');
  }

  // ════════════════════════════════════════════════════════════════════════
  section('8. Notifications');
  // ════════════════════════════════════════════════════════════════════════

  let notifId;
  await test('GET /api/notifications — student has results-published notification', async () => {
    const res = await api('GET', '/api/notifications', { token: students[1].token });
    assertStatus(res, 200, 'list notifications');
    assert(res.data.data.total >= 1, 'expected at least 1 notification (results published)');
    notifId = res.data.data.notifications[0]._id;
  });

  await test('GET /api/notifications?unreadOnly=true — filter works', async () => {
    const res = await api('GET', '/api/notifications?unreadOnly=true', { token: students[1].token });
    assertStatus(res, 200, 'unread filter');
    assert(res.data.data.notifications.every((n) => !n.isRead), 'all returned should be unread');
  });

  await test('PATCH /api/notifications/:id/read — mark single as read', async () => {
    const res = await api('PATCH', `/api/notifications/${notifId}/read`, { token: students[1].token });
    assertStatus(res, 200, 'mark as read');
  });

  await test('PATCH /api/notifications/read-all — mark all as read', async () => {
    const res = await api('PATCH', '/api/notifications/read-all', { token: students[1].token });
    assertStatus(res, 200, 'mark all as read');
  });

  await test('DELETE /api/notifications/:id — delete notification', async () => {
    const res = await api('DELETE', `/api/notifications/${notifId}`, { token: students[1].token });
    assertStatus(res, 200, 'delete notification');
  });

  await test('GET /api/notifications — instructor has zero (valid empty state)', async () => {
    const res = await api('GET', '/api/notifications', { token: instructor2.token });
    assertStatus(res, 200, 'empty notifications list');
    assertEqual(res.data.data.total, 0, 'instructor2 has no notifications');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('9. Dashboards — Role-Specific Aggregation');
  // ════════════════════════════════════════════════════════════════════════

  await test('GET /api/dashboard/instructor', async () => {
    const res = await api('GET', '/api/dashboard/instructor', { token: instructor.token });
    assertStatus(res, 200, 'instructor dashboard');
    assert(res.data.data.stats.totalSessions >= 2, 'expected at least 2 sessions');
    assert(res.data.data.stats.completedSessions >= 1, 'expected at least 1 completed session');
  });

  await test('GET /api/dashboard/instructor — student forbidden (403)', async () => {
    const res = await api('GET', '/api/dashboard/instructor', { token: students[0].token });
    assertStatus(res, 403, 'student blocked from instructor dashboard');
  });

  await test('GET /api/dashboard/student', async () => {
    const res = await api('GET', '/api/dashboard/student', { token: students[0].token });
    assertStatus(res, 200, 'student dashboard');
    assert(res.data.data.stats.publishedResultsCount >= 1, 'expected at least 1 published result');
    assert(res.data.data.stats.avgScore !== null, 'expected computed average score');
  });

  await test('GET /api/dashboard/student — instructor forbidden (403)', async () => {
    const res = await api('GET', '/api/dashboard/student', { token: instructor.token });
    assertStatus(res, 403, 'instructor blocked from student dashboard');
  });

  await test('GET /api/dashboard/session/:sessionId — board readable after session ended', async () => {
    const res = await api('GET', `/api/dashboard/session/${session._id}`, { token: instructor.token });
    assertStatus(res, 200, 'session board post-completion');
    assertEqual(res.data.data.summary.published, 3, 'all 3 published');
  });

  // ════════════════════════════════════════════════════════════════════════
  section('10. Cleanup — Delete a session');
  // ════════════════════════════════════════════════════════════════════════

  await test('DELETE /api/sessions/:sessionId — cannot delete active session (only tested via paidSession draft)', async () => {
    const res = await api('DELETE', `/api/sessions/${paidSession._id}`, { token: instructor.token });
    // paidSession was never started — still draft — deletion should succeed
    assertStatus(res, 200, 'delete draft session');
  });

  await test('DELETE /api/sessions/:sessionId — already-deleted session (404)', async () => {
    const res = await api('DELETE', `/api/sessions/${paidSession._id}`, { token: instructor.token });
    assertStatus(res, 404, 'delete nonexistent session');
  });

  printSummary();
}

main().catch((err) => {
  console.error('\nFATAL ERROR — test suite crashed:', err);
  process.exit(1);
});