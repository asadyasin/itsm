const router = require('express').Router();
const ctrl = require('../controllers/itemCategoryController');
const bulkCtrl = require('../controllers/bulkController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { categoryRules } = require('../validators/inventoryValidators');

router.use(protect);
router.get('/', ctrl.list);
router.post('/bulk-import', authorize('admin'), upload.single('file'), bulkCtrl.importCategories);
router.post('/', authorize('admin'), categoryRules, validate, ctrl.create);
router.patch('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
