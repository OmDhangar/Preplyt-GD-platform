const { body, param, query } = require('express-validator');

const createSessionRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Session title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('templateId')
    .if(body('sessionType').not().equals('podcast'))
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
    .isInt({ min: 1, max: 1000 }).withMessage('maxParticipants must be between 1 and 1000'),
  body('sessionType')
    .optional()
    .isIn(['gd', 'personal_interview', 'podcast']).withMessage('sessionType must be gd, personal_interview, or podcast'),
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
  body('coInstructors')
    .optional()
    .isArray().withMessage('coInstructors must be an array of instructor IDs')
    .custom((ids) => ids.every((id) => /^[a-fA-F0-9]{24}$/.test(id)))
    .withMessage('All coInstructors must be valid MongoDB ObjectIds'),
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
  body('coInstructors')
    .optional()
    .isArray().withMessage('coInstructors must be an array of instructor IDs')
    .custom((ids) => ids.every((id) => /^[a-fA-F0-9]{24}$/.test(id)))
    .withMessage('All coInstructors must be valid MongoDB ObjectIds'),
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
