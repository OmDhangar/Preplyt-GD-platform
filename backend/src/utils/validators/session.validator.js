const { body, param, query } = require('express-validator');

const createSessionRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Session title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('templateId')
    .notEmpty().withMessage('Template ID is required')
    .isMongoId().withMessage('Invalid template ID'),
  body('scheduledAt')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('scheduledAt must be a valid ISO date'),
  body('durationMins')
    .optional()
    .isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage('maxParticipants must be between 1 and 500'),
  body('requiresPayment')
    .optional()
    .isBoolean().withMessage('requiresPayment must be boolean'),
  body('sessionFee.amount')
    .if(body('requiresPayment').equals('true'))
    .notEmpty().withMessage('Session fee amount is required when payment is enabled')
    .isFloat({ min: 0 }).withMessage('Session fee must be a positive number'),
  // Admin can assign an instructor to the session
  body('instructorId')
    .optional()
    .isMongoId().withMessage('Invalid instructor ID'),
];

const updateSessionRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('templateId')
    .optional()
    .isMongoId().withMessage('Invalid template ID'),
  body('scheduledAt')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('scheduledAt must be a valid ISO date'),
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
];

const sessionIdParam = [
  param('sessionId')
    .isMongoId().withMessage('Invalid session ID'),
];

const assignStudentsRules = [
  body('studentIds')
    .isArray({ min: 1 }).withMessage('studentIds must be a non-empty array')
    .custom((ids) => ids.every((id) => /^[a-fA-F0-9]{24}$/.test(id)))
    .withMessage('All studentIds must be valid MongoDB ObjectIds'),
];

const rescheduleSessionRules = [
  body('newScheduledAt')
    .notEmpty().withMessage('newScheduledAt is required')
    .isISO8601().withMessage('newScheduledAt must be a valid ISO date'),
  body('durationMins')
    .optional()
    .isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
];

module.exports = {
  createSessionRules,
  updateSessionRules,
  sessionIdParam,
  assignStudentsRules,
  rescheduleSessionRules,
};
