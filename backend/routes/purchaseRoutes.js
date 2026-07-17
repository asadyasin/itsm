const router = require('express').Router();
const ctrl = require('../controllers/purchaseController');
const bulkCtrl = require('../controllers/bulkController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { purchaseRules } = require('../validators/inventoryValidators');

router.use(protect);
router.get('/', authorize('admin', 'manager'), ctrl.list);
router.post('/bulk-import', authorize('admin'), upload.single('file'), bulkCtrl.importPurchases);
router.get('/:id', authorize('admin', 'manager'), ctrl.get);
router.post('/', authorize('admin'), purchaseRules, validate, ctrl.create);
router.patch('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
