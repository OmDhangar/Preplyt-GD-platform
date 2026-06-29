# GD Evaluation Platform — Backend

Production-quality Node.js/Express backend for a real-time Group Discussion
evaluation platform with role-based dashboards, dynamic rubric templates,
Socket.IO sync, and Razorpay payments.

---

## 1 · Folder Structure

```
backend/
├── server.js                        # Entry point — HTTP + WS server bootstrap
├── .env.example                     # All required environment variables
├── package.json
└── src/
    ├── app.js                       # Express factory (security, CORS, routes)
    ├── config/
    │   ├── constants.js             # All enums: roles, statuses, socket events
    │   ├── db.js                    # Mongoose connect with retry logic
    │   └── logger.js                # Winston + daily-rotate-file
    ├── models/
    │   ├── User.js                  # Auth, JWT helpers, bcrypt hooks
    │   ├── InstructorProfile.js
    │   ├── StudentProfile.js
    │   ├── EvaluationTemplate.js    # Dynamic rubric fields engine
    │   ├── GdSession.js             # Session lifecycle + joinCode generation
    │   ├── SessionParticipant.js    # Student ↔ Session enrollment link
    │   ├── EvaluationRecord.js      # LWW field-level sync, score computation
    │   ├── Payment.js               # Razorpay + Stripe stub, webhook events
    │   ├── Notification.js          # Auto-expires after 60 days
    │   └── AuditLog.js              # Immutable, auto-expires after 90 days
    ├── middleware/
    │   ├── auth.js                  # JWT Bearer verification → req.user
    │   ├── roles.js                 # restrictTo(...roles), ownerOrAdmin()
    │   ├── validate.js              # express-validator error formatter
    │   └── errorHandler.js          # Central error handler (Mongoose + JWT transforms)
    ├── controllers/
    │   ├── auth.controller.js       # Register, login, refresh, reset password
    │   ├── user.controller.js       # /me, profiles, admin user management
    │   ├── gdSession.controller.js  # Full session lifecycle + participant mgmt
    │   ├── template.controller.js   # Rubric CRUD, versioning, publish, archive
    │   ├── evaluation.controller.js # Batch write, submit, publish, results
    │   ├── payment.controller.js    # Razorpay order/verify/webhook
    │   ├── notification.controller.js
    │   └── dashboard.controller.js  # Role-specific aggregated dashboard data
    ├── routes/
    │   ├── index.js                 # Mounts all routers at /api
    │   └── *.routes.js
    ├── services/
    │   ├── audit.service.js         # Fire-and-forget audit logging
    │   ├── email.service.js         # Nodemailer + named templates
    │   └── payment/
    │       ├── index.js             # Gateway factory (env-driven)
    │       ├── razorpay.provider.js # Full Razorpay integration
    │       └── stripe.provider.js   # Stub — swap PAYMENT_PROVIDER=stripe
    ├── sockets/
    │   ├── index.js                 # Socket.IO server bootstrap
    │   ├── socketAuth.js            # JWT middleware for WS connections
    │   └── handlers/
    │       ├── session.handler.js   # Room join/leave, multi-device presence
    │       └── evaluation.handler.js# Field broadcast (no DB write) + syncDirty
    ├── utils/
    │   ├── AppError.js              # Custom operational error class
    │   ├── asyncHandler.js          # Wraps async controllers → next(err)
    │   ├── apiResponse.js           # success / created / fail / paginated helpers
    │   └── validators/              # express-validator rule arrays per domain
    └── seeds/
        └── seed.js                  # Full demo dataset (5 students, 2 instructors, sessions)
```

---

## 2 · Environment Variables

Copy `.env.example` → `.env` and fill in:

```bash
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gd_eval_platform

# JWT
JWT_SECRET=<min 64 random chars>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<different long random string>
JWT_REFRESH_EXPIRES_IN=30d

# Email (any SMTP — Gmail works with App Passwords)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_NAME=GD Eval Platform
EMAIL_FROM_ADDRESS=noreply@yourapp.com

# Razorpay (get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Payment provider: "razorpay" (default) or "stripe" (stub)
PAYMENT_PROVIDER=razorpay

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
SOCKET_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 3 · Setup & Run

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env with your values

# 3. (Optional) Start MongoDB locally
mongod --dbpath ./data/db

# 4. Seed demo data
npm run seed
# To wipe + re-seed:   npm run seed:clear

# 5. Start server
npm run dev        # development (nodemon)
npm start          # production
```

The server starts at `http://localhost:5000`.
Health check: `GET /health`

---

## 4 · Demo Credentials (after seeding)

| Role       | Email                       | Password   |
|------------|-----------------------------|------------|
| Admin      | admin@gdeval.dev            | Demo@1234  |
| Instructor | instructor@gdeval.dev       | Demo@1234  |
| Instructor | instructor2@gdeval.dev      | Demo@1234  |
| Student    | aryan.sharma@gdeval.dev     | Demo@1234  |
| Student    | priya.patel@gdeval.dev      | Demo@1234  |
| Student    | rohit.verma@gdeval.dev      | Demo@1234  |
| Student    | neha.singh@gdeval.dev       | Demo@1234  |
| Student    | karthik.nair@gdeval.dev     | Demo@1234  |

---

## 5 · REST API Reference

All endpoints are prefixed with `/api`. Protected routes require:
`Authorization: Bearer <accessToken>`

### Auth  `/api/auth`

| Method | Path                        | Auth | Description                       |
|--------|-----------------------------|------|-----------------------------------|
| POST   | /register                   | —    | Create account (student/instructor)|
| POST   | /login                      | —    | Login → accessToken + refreshToken|
| POST   | /refresh                    | —    | Rotate refresh token              |
| POST   | /logout                     | ✓    | Invalidate refresh token          |
| GET    | /verify/:token              | —    | Verify email address              |
| POST   | /forgot-password            | —    | Send password reset email         |
| PATCH  | /reset-password/:token      | —    | Reset password with token         |

### Users  `/api/users`

| Method | Path              | Roles           | Description                    |
|--------|-------------------|-----------------|--------------------------------|
| GET    | /me               | all             | Own user + profile             |
| PATCH  | /me               | all             | Update name/avatar             |
| GET    | /me/profile       | all             | Role-specific profile          |
| PATCH  | /me/profile       | all             | Update role-specific profile   |
| GET    | /                 | admin           | List all users (paginated)     |
| PATCH  | /:id/status       | admin           | Activate / deactivate user     |

### GD Sessions  `/api/sessions`

| Method | Path                          | Roles              | Description                  |
|--------|-------------------------------|--------------------|------------------------------|
| POST   | /                             | instructor, admin  | Create session               |
| GET    | /                             | instructor, admin  | List sessions (paginated)    |
| GET    | /join/:joinCode               | all (pre-auth)     | Lookup by join code          |
| GET    | /:sessionId                   | all                | Get session detail (hides keys if unregistered) |
| GET    | /public/upcoming              | all                | List public upcoming & completed sessions |
| PATCH  | /:sessionId                   | instructor, admin  | Update draft/scheduled session|
| DELETE | /:sessionId                   | instructor, admin  | Delete non-active session    |
| POST   | /:sessionId/start             | instructor, admin  | Activate session, pre-create drafts |
| POST   | /:sessionId/end               | instructor, admin  | Mark completed, notify room  |
| POST   | /:sessionId/participants      | instructor, admin  | Bulk-assign students         |
| GET    | /:sessionId/participants      | instructor, admin  | List participants            |

### Evaluation Templates  `/api/templates`

| Method | Path              | Roles              | Description               |
|--------|-------------------|--------------------|---------------------------|
| POST   | /                 | instructor, admin  | Create template           |
| GET    | /                 | instructor, admin  | List templates            |
| GET    | /:id              | instructor, admin  | Get template (full fields)|
| PATCH  | /:id              | instructor, admin  | Update (creates new version if active) |
| PATCH  | /:id/publish      | instructor, admin  | Set status → active       |
| PATCH  | /:id/archive      | instructor, admin  | Archive template          |
| POST   | /:id/duplicate    | instructor, admin  | Copy as new draft         |
| DELETE | /:id              | instructor, admin  | Delete template (fails if template is in use) |

**Template field types:** `number`, `select`, `multi_select`, `text`, `boolean`, `weighted_score`

### Evaluations  `/api/evaluations`

| Method | Path                                                  | Roles              | Description                       |
|--------|-------------------------------------------------------|--------------------|-----------------------------------|
| PATCH  | /batch                                                | instructor, admin  | **Batch upsert** (allowed in active & completed sessions; rejects edits on published evals) |
| GET    | /sessions/:sessionId/evaluations                      | instructor, admin  | All records × instructor (preload)|
| GET    | /sessions/:sessionId/evaluations/:studentId           | instructor, admin  | Single record (auto-creates draft)|
| PATCH  | /sessions/:sessionId/evaluations/:studentId/submit    | instructor, admin  | Submit + compute score            |
| POST   | /sessions/:sessionId/evaluations/publish              | instructor, admin  | Auto-creates missing drafts, computes draft scores on-the-fly, updates session's evaluatedCount, publishes & emails results |
| GET    | /sessions/:sessionId/results                          | all                | Published results (filtered by role) |

**Batch upsert body:**
```json
{
  "sessionId": "...",
  "updates": [
    {
      "studentId": "...",
      "fieldValues": [
        { "fieldId": "communication", "value": 8, "scoredAt": "2024-01-01T10:00:00Z", "deviceLabel": "Laptop" }
      ],
      "overallComment": "Good performance"
    }
  ]
}
```

### Payments  `/api/payments`

| Method | Path                          | Auth | Description                        |
|--------|-------------------------------|------|------------------------------------|
| POST   | /webhook                      | —    | Razorpay webhook (raw body)        |
| POST   | /order                        | ✓    | Create Razorpay order              |
| POST   | /verify                       | ✓    | Verify payment signature           |
| GET    | /session/:sessionId/status    | ✓    | Payment status for a session       |
| GET    | /history                      | ✓    | User payment history               |

**Create order body:** `{ "sessionId": "..." }`

**Verify body:** `{ "paymentId": "...", "orderId": "rzp_order_...", "razorpayPaymentId": "pay_...", "razorpaySignature": "..." }`

### Notifications  `/api/notifications`

| Method | Path          | Auth | Description                  |
|--------|---------------|------|------------------------------|
| GET    | /             | ✓    | List notifications           |
| PATCH  | /read-all     | ✓    | Mark all as read             |
| PATCH  | /:id/read     | ✓    | Mark one as read             |
| DELETE | /:id          | ✓    | Delete notification          |

### Dashboards  `/api/dashboard`

| Method | Path                   | Roles              | Description                     |
|--------|------------------------|--------------------|---------------------------------|
| GET    | /instructor            | instructor, admin  | Stats, recent/upcoming sessions |
| GET    | /student               | student            | Enrollments, results, payments  |
| GET    | /session/:sessionId    | instructor, admin  | Live board: all students + eval status + per-field averages |

---

## 6 · Socket.IO Reference

**Connection:** `ws://localhost:5000`
**Auth:** `{ auth: { token: '<JWT>', deviceLabel: 'Laptop' } }`

### Client → Server Events

| Event             | Payload                                                    | Description                          |
|-------------------|------------------------------------------------------------|--------------------------------------|
| `session:join`    | `{ sessionId }`                                            | Join session room (auth checked)     |
| `session:leave`   | `{ sessionId }`                                            | Explicit leave                       |
| `eval:fieldUpdate`| `{ sessionId, studentId, fieldId, value, scoredAt, deviceLabel }` | Broadcast field change — **no DB write** |
| `eval:syncDirty`  | `{ sessionId, updates: [{studentId, fieldValues}] }`       | Reconnect flush — **writes to DB**   |

### Server → Client Events

| Event                    | Payload                                                       | Description                     |
|--------------------------|---------------------------------------------------------------|---------------------------------|
| `session:joinAck`        | `{ sessionId, sessionStatus, presence }`                      | Confirms join                   |
| `session:participantJoined` | `{ userId, name, role, deviceLabel }`                      | Someone else joined room        |
| `session:started`        | `{ sessionId }`                                               | Session went live               |
| `session:ended`          | `{ sessionId }`                                               | Session ended                   |
| `eval:fieldUpdated`      | `{ sessionId, studentId, fieldId, value, scoredAt, instructorId }` | Broadcast from another device |
| `eval:syncDirtyAck`      | `{ synced }`                                                  | Confirms offline sync           |
| `error`                  | `{ message }`                                                 | Socket-level error              |

### Real-time Sync Architecture

```
Instructor types in field
        │
        ├─→ socket.emit('eval:fieldUpdate')   ← INSTANT broadcast only
        │         Server re-emits to room      ← No DB write here
        │
        └─→ Every 5 seconds (client-side timer)
                  REST PATCH /api/evaluations/batch   ← SOLE DB write path
                  LWW applied per field (scoredAt timestamp)

On reconnect:
        socket.emit('eval:syncDirty', { updates: dirtyFields })
        Server writes dirty fields to DB (one-time recovery write)
        Server broadcasts to room
```

---

## 7 · Data Models Cheat Sheet

### EvaluationTemplate field types

| type             | Renders as            | DB value type   | Score contribution |
|------------------|-----------------------|-----------------|--------------------|
| `number`         | Number input/slider   | Number          | Direct (min–max)   |
| `weighted_score` | Number × weight       | Number          | value × weight     |
| `select`         | Radio / dropdown      | String          | None               |
| `multi_select`   | Checkboxes            | String[]        | None               |
| `text`           | Textarea              | String          | None               |
| `boolean`        | Toggle / checkbox     | Boolean         | None               |

### EvaluationRecord status flow

```
(session starts)
    │
  DRAFT  ──→  [batch writes via REST every 5s]
    │
  SUBMIT  (score computed, locked from further edits)
    │
  PUBLISHED  (students notified, results visible)
```

### Payment flow (Razorpay)

```
1. POST /api/payments/order          → Razorpay order created
2. Frontend: Razorpay Checkout JS    → User pays
3. POST /api/payments/verify         → Signature verified, participant activated
4. POST /api/payments/webhook        → Server-side confirmation (idempotent)
```

---

## 8 · Security Checklist

| Control                    | Implementation                              |
|----------------------------|---------------------------------------------|
| Password hashing           | bcrypt, 12 rounds                          |
| JWT access tokens          | 7-day expiry, RS-style secret              |
| Refresh token rotation     | Max 5 per user, theft detection            |
| NoSQL injection            | express-mongo-sanitize                     |
| XSS                        | xss-clean middleware                       |
| CORS                       | Explicit origin whitelist                  |
| Rate limiting              | 100 req/15min global; 20 req/15min auth    |
| Authorization              | Role middleware on every protected route   |
| Audit trail                | Every state-changing action logged         |
| Webhook verification       | HMAC-SHA256 signature check (Razorpay)    |
| Socket auth                | JWT verified before any room join          |
| Room authorization         | Instructor/student checked on join event   |

---

## 9 · API Response Envelope

Every response follows this structure:

```json
// Success
{
  "success": true,
  "message": "Session created",
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 47 }  // paginated only
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "Invalid email" }]
}
```

---

## 10 · Frontend Integration Notes

When the frontend is built, use these patterns:

```javascript
// 1. Auth header on every request
headers: { Authorization: `Bearer ${accessToken}` }

// 2. Socket connection
const socket = io('http://localhost:5000', {
  auth: { token: accessToken, deviceLabel: navigator.userAgent.slice(0, 40) },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// 3. Preload all eval records for a session (then use socket for live updates)
GET /api/evaluations/sessions/:sessionId/evaluations
// Response.data.byStudentId  → O(1) lookup map

// 4. Batch flush (call every 5s from a setInterval)
PATCH /api/evaluations/batch
{ sessionId, updates: dirtyFieldsArray }

// 5. On socket reconnect — push offline changes
socket.on('connect', () => {
  if (dirtyFields.size > 0) {
    socket.emit('eval:syncDirty', { sessionId, updates: [...dirtyFields] });
  }
});

// 6. Load evaluation template for dynamic form rendering
GET /api/templates/:templateId
// template.fields[] → render form controls based on field.type
```
