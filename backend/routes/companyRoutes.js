const router = require('express').Router();
const ctrl = require('../controllers/companyController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');

router.use(protect);
router.get('/', ctrl.list);
router.post('/', authorize('admin'), ctrl.create);
router.patch('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
