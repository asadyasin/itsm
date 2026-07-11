const router = require('express').Router();
const ctrl = require('../controllers/purchaseController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validate');
const { purchaseRules } = require('../validators/inventoryValidators');

router.use(protect);
router.get('/', authorize('admin', 'manager'), ctrl.list);
router.get('/:id', authorize('admin', 'manager'), ctrl.get);
router.post('/', authorize('admin'), purchaseRules, validate, ctrl.create);
router.patch('/:id', authorize('admin'), ctrl.update);

module.exports = router;
