const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const protect = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/', ctrl.list);
router.patch('/:id/read', ctrl.markRead);
router.patch('/read-all', ctrl.markAllRead);

module.exports = router;
