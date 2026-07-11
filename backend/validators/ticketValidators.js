const { body } = require('express-validator');

exports.createTicketRules = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('requestedItemCategory').isMongoId().withMessage('Valid item category is required'),
  body('quantity').optional().isInt({ min: 1 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical'])
];

exports.updateTicketRules = [
  body('description').optional().trim().notEmpty(),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical'])
];

exports.rejectTicketRules = [
  body('rejectionReason').trim().notEmpty().withMessage('Rejection reason is required')
];

exports.commentRules = [
  body('message').trim().notEmpty().withMessage('Comment message is required'),
  body('isInternal').optional().isBoolean()
];
