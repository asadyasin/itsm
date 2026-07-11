const { body } = require('express-validator');

exports.createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['admin', 'manager', 'user']),
  body('department').optional().isMongoId()
];

exports.updateUserRules = [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'manager', 'user']),
  body('department').optional().isMongoId()
];
