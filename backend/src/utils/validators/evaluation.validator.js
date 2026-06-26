const { body, param } = require('express-validator');

const batchUpdateRules = [
  body('sessionId')
    .notEmpty().withMessage('sessionId is required')
    .isMongoId().withMessage('Invalid sessionId'),
  body('updates')
    .isArray({ min: 1 }).withMessage('updates must be a non-empty array'),
  body('updates.*.studentId')
    .notEmpty().withMessage('studentId is required in each update')
    .isMongoId().withMessage('Invalid studentId in update'),
  body('updates.*.fieldValues')
    .isArray().withMessage('fieldValues must be an array'),
  body('updates.*.fieldValues.*.fieldId')
    .notEmpty().withMessage('fieldId is required in each fieldValue'),
  body('updates.*.fieldValues.*.scoredAt')
    .optional()
    .isISO8601().withMessage('scoredAt must be a valid ISO date'),
];

const submitRules = [
  param('sessionId').isMongoId().withMessage('Invalid sessionId'),
  param('studentId').isMongoId().withMessage('Invalid studentId'),
];

const publishRules = [
  param('sessionId').isMongoId().withMessage('Invalid sessionId'),
  body('studentIds')
    .optional()
    .isArray().withMessage('studentIds must be an array'),
];

module.exports = { batchUpdateRules, submitRules, publishRules };
