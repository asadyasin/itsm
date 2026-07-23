const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');

router.use(protect, authorize('admin'));

router.get('/asset-history/search', ctrl.searchAssetForHistory);
router.get('/asset-history/:itemId', ctrl.assetHistoryReport);
router.get('/:type', ctrl.generate);

module.exports = router;
