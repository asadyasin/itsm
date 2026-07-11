const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');

router.use(protect);
router.get('/:type', authorize('admin', 'manager'), ctrl.generate);

module.exports = router;
