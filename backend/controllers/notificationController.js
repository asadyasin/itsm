const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');

// GET /api/notifications
exports.list = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.json({ success: true, data: notifications, meta: { unreadCount } });
});

// PATCH /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, recipient: req.user._id }, { isRead: true });
  res.json({ success: true });
});

// PATCH /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
});
