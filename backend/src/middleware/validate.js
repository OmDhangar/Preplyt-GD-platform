const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Run after express-validator chains.
 * If there are validation errors, respond 400 with a structured list.
 * Otherwise, call next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((e) => ({
    field:   e.path || e.param,
    message: e.msg,
    value:   e.value,
  }));

  return next(new AppError('Validation failed', 400, formatted));
};

module.exports = validate;
