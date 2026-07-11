const router = require('express').Router();
const ctrl = require('../controllers/auditLogController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');

router.use(protect, authorize('admin'));
router.get('/', ctrl.list);

module.exports = router;
