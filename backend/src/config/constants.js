// Centralised constants — import from here, never hardcode strings in business logic

const ROLES = Object.freeze({
  STUDENT:    'student',
  INSTRUCTOR: 'instructor',
  ADMIN:      'admin',
});

const SESSION_STATUS = Object.freeze({
  DRAFT:     'draft',
  SCHEDULED: 'scheduled',
  ACTIVE:    'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

const EVALUATION_STATUS = Object.freeze({
  DRAFT:     'draft',
  SUBMITTED: 'submitted',
  PUBLISHED: 'published',
});

const SESSION_TYPES = Object.freeze({
  GD:                 'gd',
  PERSONAL_INTERVIEW: 'personal_interview',
  PODCAST:            'podcast',
});

const PARTICIPANT_STATUS = Object.freeze({
  INVITED:    'invited',
  REGISTERED: 'registered',
  RESERVED:   'reserved',
  ATTENDED:   'attended',
  ABSENT:     'absent',
  REMOVED:    'removed',
});

const PAYMENT_STATUS = Object.freeze({
  CREATED:   'created',
  PENDING:   'pending',
  PAID:      'paid',
  FAILED:    'failed',
  REFUNDED:  'refunded',
  CANCELLED: 'cancelled',
});

const PAYMENT_PROVIDERS = Object.freeze({
  RAZORPAY: 'razorpay',
  STRIPE:   'stripe',
});

const TEMPLATE_STATUS = Object.freeze({
  DRAFT:    'draft',
  ACTIVE:   'active',
  ARCHIVED: 'archived',
});

const FIELD_TYPES = Object.freeze({
  NUMBER:         'number',
  SELECT:         'select',
  MULTI_SELECT:   'multi_select',
  TEXT:           'text',
  BOOLEAN:        'boolean',
  WEIGHTED_SCORE: 'weighted_score',
});

const INSTRUCTOR_VERIFICATION_STATUS = Object.freeze({
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

const NOTIFICATION_TYPES = Object.freeze({
  SESSION_INVITE:       'session_invite',
  SESSION_START:        'session_start',
  SESSION_END:          'session_end',
  SESSION_RESCHEDULED:  'session_rescheduled',
  RESULTS_PUBLISHED:    'results_published',
  PAYMENT_SUCCESS:      'payment_success',
  PAYMENT_FAILED:       'payment_failed',
  GD_SUBSCRIPTION:      'gd_subscription',
  INSTRUCTOR_VERIFIED:  'instructor_verified',
  INSTRUCTOR_REJECTED:  'instructor_rejected',
  SYSTEM:               'system',
});

const AUDIT_ACTIONS = Object.freeze({
  // Auth
  USER_REGISTER:          'user.register',
  USER_LOGIN:             'user.login',
  USER_LOGOUT:            'user.logout',
  PASSWORD_RESET:         'user.password_reset',
  // Instructor verification
  INSTRUCTOR_VERIFY:      'instructor.verify',
  INSTRUCTOR_REJECT:      'instructor.reject',
  // Sessions
  SESSION_CREATE:         'session.create',
  SESSION_UPDATE:         'session.update',
  SESSION_DELETE:         'session.delete',
  SESSION_START:          'session.start',
  SESSION_END:            'session.end',
  SESSION_RESCHEDULE:     'session.reschedule',
  SESSION_ATTACHMENT_ADD: 'session.attachment_add',
  SESSION_ATTACHMENT_DEL: 'session.attachment_delete',
  // Evaluations
  EVAL_DRAFT_SAVE:        'evaluation.draft_save',
  EVAL_SUBMIT:            'evaluation.submit',
  EVAL_PUBLISH:           'evaluation.publish',
  EVAL_BATCH_SAVE:        'evaluation.batch_save',
  // Templates
  TEMPLATE_CREATE:        'template.create',
  TEMPLATE_UPDATE:        'template.update',
  TEMPLATE_PUBLISH:       'template.publish',
  TEMPLATE_ARCHIVE:       'template.archive',
  TEMPLATE_DELETE:        'template.delete',
  // Payments
  PAYMENT_ORDER:          'payment.order_created',
  PAYMENT_VERIFIED:       'payment.verified',
  PAYMENT_WEBHOOK:        'payment.webhook',
});

// Socket event names — shared with frontend
const SOCKET_EVENTS = Object.freeze({
  // Client → Server
  JOIN_SESSION:      'session:join',
  LEAVE_SESSION:     'session:leave',
  FIELD_UPDATE:      'eval:fieldUpdate',
  SYNC_DIRTY:        'eval:syncDirty',

  // Server → Client
  FIELD_UPDATED:     'eval:fieldUpdated',   // broadcast from server
  SYNC_DIRTY_ACK:    'eval:syncDirtyAck',
  SESSION_STARTED:   'session:started',
  SESSION_ENDED:     'session:ended',
  SESSION_RESCHEDULED:'session:rescheduled',
  PARTICIPANT_JOINED:'session:participantJoined',
  ERROR:             'error',
});

module.exports = {
  ROLES,
  SESSION_STATUS,
  SESSION_TYPES,
  EVALUATION_STATUS,
  PARTICIPANT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  TEMPLATE_STATUS,
  FIELD_TYPES,
  INSTRUCTOR_VERIFICATION_STATUS,
  NOTIFICATION_TYPES,
  AUDIT_ACTIONS,
  SOCKET_EVENTS,
};
