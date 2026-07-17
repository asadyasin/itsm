const router = require('express').Router();
const ctrl = require('../controllers/userController');
const bulkCtrl = require('../controllers/bulkController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { createUserRules, updateUserRules } = require('../validators/userValidators');

router.use(protect);

router.get('/', authorize('admin', 'manager'), ctrl.listUsers);
router.post('/bulk-import', authorize('admin'), upload.single('file'), bulkCtrl.importUsers);
router.get('/:id', authorize('admin', 'manager'), ctrl.getUser);
router.post('/', authorize('admin'), createUserRules, validate, ctrl.createUser);
router.patch('/:id', authorize('admin'), updateUserRules, validate, ctrl.updateUser);
router.patch('/:id/disable', authorize('admin'), ctrl.toggleActive);
router.post('/:id/reset-password', authorize('admin'), ctrl.resetPassword);
router.delete('/:id', authorize('admin'), ctrl.softDeleteUser);

module.exports = router;
