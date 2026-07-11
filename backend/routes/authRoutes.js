const router = require('express').Router();
const ctrl = require('../controllers/authController');
const protect = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/security');
const { loginRules, changePasswordRules } = require('../validators/authValidators');

router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.getMe);
router.patch('/change-password', protect, changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
