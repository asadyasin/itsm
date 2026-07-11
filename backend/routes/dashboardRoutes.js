const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');

router.use(protect);
router.get('/summary', ctrl.summary);
router.get('/charts', authorize('admin'), ctrl.charts);

module.exports = router;
