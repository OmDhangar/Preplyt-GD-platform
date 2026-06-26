const { body } = require('express-validator');
const { FIELD_TYPES } = require('../../config/constants');

const fieldRules = [
  body('fields')
    .isArray({ min: 1 }).withMessage('Template must have at least one field'),
  body('fields.*.fieldId')
    .trim()
    .notEmpty().withMessage('Each field must have a fieldId')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('fieldId can only contain letters, numbers and underscores'),
  body('fields.*.label')
    .trim()
    .notEmpty().withMessage('Each field must have a label'),
  body('fields.*.type')
    .isIn(Object.values(FIELD_TYPES))
    .withMessage(`Field type must be one of: ${Object.values(FIELD_TYPES).join(', ')}`),
  // Conditional: select/multi_select require options
  body('fields.*.options')
    .if(body('fields.*.type').isIn(['select', 'multi_select']))
    .isArray({ min: 1 }).withMessage('select/multi_select fields require at least one option'),
];

const createTemplateRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Template name is required')
    .isLength({ max: 120 }).withMessage('Name cannot exceed 120 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  ...fieldRules,
];

const updateTemplateRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 120 }).withMessage('Name cannot exceed 120 characters'),
  body('fields')
    .optional()
    .isArray({ min: 1 }).withMessage('Template must have at least one field'),
];

module.exports = { createTemplateRules, updateTemplateRules };
