const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const protect = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/summary', ctrl.summary);
router.get('/charts', ctrl.charts);

module.exports = router;
