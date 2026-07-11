const asyncHandler = require('../utils/asyncHandler');
const AuditLog = require('../models/AuditLog');

// GET /api/audit-logs  (admin only)
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, module, actor } = req.query;
  const filter = {};
  if (module) filter.module = module;
  if (actor) filter.actor = actor;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate('actor', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(filter)
  ]);

  res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
});
