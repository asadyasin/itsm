const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after an array of express-validator checks; short-circuits with 400 on failure.
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation failed', errors.array().map((e) => ({ field: e.path, message: e.msg }))));
  }
  next();
};
