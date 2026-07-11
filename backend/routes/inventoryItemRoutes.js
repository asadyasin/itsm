const router = require('express').Router();
const ctrl = require('../controllers/inventoryItemController');
const bulkCtrl = require('../controllers/bulkController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { itemUnitRules, issueRules, returnRules } = require('../validators/inventoryValidators');

router.use(protect);

router.get('/', ctrl.list); // scoped per role inside controller
router.get('/bulk-export', authorize('admin', 'manager'), bulkCtrl.exportInventory);
router.post('/bulk-import', authorize('admin'), upload.single('file'), bulkCtrl.importInventory);

router.post('/issue', authorize('admin'), issueRules, validate, ctrl.issueItem);
router.post('/return', authorize('admin'), returnRules, validate, ctrl.returnItem);

router.get('/:id', ctrl.get);
router.get('/:id/qrcode', ctrl.getQrCode);
router.post('/:id/transfer', authorize('admin'), ctrl.transferItem);
router.post('/:id/scrap', authorize('admin'), ctrl.scrapItem);
router.patch('/:id/status', authorize('admin'), ctrl.updateStatus);

router.post('/', authorize('admin'), ctrl.createUnits); // Step 3: register serials

module.exports = router;
