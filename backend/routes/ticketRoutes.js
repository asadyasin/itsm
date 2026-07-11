const router = require('express').Router();
const ctrl = require('../controllers/ticketController');
const commentCtrl = require('../controllers/ticketCommentController');
const protect = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { createTicketRules, updateTicketRules, rejectTicketRules, commentRules } = require('../validators/ticketValidators');

router.use(protect);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', upload.array('attachments', 5), createTicketRules, validate, ctrl.create);
router.patch('/:id', updateTicketRules, validate, ctrl.update);

router.patch('/:id/approve', authorize('admin', 'manager'), ctrl.approve);
router.patch('/:id/reject', authorize('admin', 'manager'), rejectTicketRules, validate, ctrl.reject);
router.patch('/:id/assign', authorize('admin'), ctrl.assign);
router.patch('/:id/resolve', authorize('admin'), ctrl.resolve);
router.patch('/:id/close', authorize('admin'), ctrl.close);
router.patch('/:id/reopen', ctrl.reopen);

router.get('/:ticketId/comments', commentCtrl.list);
router.post('/:ticketId/comments', commentRules, validate, commentCtrl.create);

module.exports = router;
