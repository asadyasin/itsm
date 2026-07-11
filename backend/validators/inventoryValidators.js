const { body } = require('express-validator');

exports.categoryRules = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('lowStockThreshold').optional().isInt({ min: 0 })
];

exports.purchaseRules = [
  body('itemCategory').isMongoId().withMessage('Valid item category is required'),
  body('vendor').isMongoId().withMessage('Valid vendor is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('purchaseDate').optional().isISO8601()
];

exports.itemUnitRules = [
  body('serialNumber').trim().notEmpty().withMessage('Serial number is required')
];

exports.issueRules = [
  body('itemId').isMongoId().withMessage('Valid inventory item is required'),
  body('ticketId').optional().isMongoId(),
  body('userId').isMongoId().withMessage('Valid recipient user is required'),
  body('sendEmail').optional().isBoolean()
];

exports.returnRules = [
  body('itemId').isMongoId().withMessage('Valid inventory item is required'),
  body('notes').optional().trim()
];
