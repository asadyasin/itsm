const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/departments', require('./departmentRoutes'));
router.use('/vendors', require('./vendorRoutes'));
router.use('/item-categories', require('./itemCategoryRoutes'));
router.use('/purchases', require('./purchaseRoutes'));
router.use('/inventory/items', require('./inventoryItemRoutes'));
router.use('/tickets', require('./ticketRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/search', require('./searchRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/audit-logs', require('./auditLogRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

module.exports = router;
