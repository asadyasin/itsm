const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Ticket = require('../models/Ticket');
const InventoryItem = require('../models/InventoryItem');
const { logAction } = require('../services/auditService');
const { notifyUser, notifyRole } = require('../services/notificationService');
const { sendTemplateEmail } = require('../services/emailService');

function scopeFilterForUser(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'manager') return { department: user.department };
  return { user: user._id };
}

// GET /api/tickets
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, priority, department, userId, search, from, to } = req.query;
  const filter = { isDeleted: false, ...scopeFilterForUser(req.user) };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (department && req.user.role === 'admin') filter.department = department;
  if (userId && req.user.role !== 'user') filter.user = userId;
  if (search) filter.$text = { $search: search };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .populate('user', 'name email')
      .populate('department', 'name')
      .populate('manager', 'name')
      .populate('requestedItemCategory', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Ticket.countDocuments(filter)
  ]);

  res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
});

// GET /api/tickets/:id
exports.get = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, isDeleted: false, ...scopeFilterForUser(req.user) };
  const ticket = await Ticket.findOne(filter)
    .populate('user', 'name email')
    .populate('department', 'name')
    .populate('manager', 'name')
    .populate('requestedItemCategory', 'name')
    .populate('assignedItems')
    .populate('assignedTo', 'name');
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  res.json({ success: true, data: ticket });
});

// POST /api/tickets  (any authenticated user)
exports.create = asyncHandler(async (req, res) => {
  const { description, requestedItemCategory, quantity, priority } = req.body;

  if (!req.user.department) throw new ApiError(400, 'Your account has no department assigned. Contact an administrator.');

  const attachments = (req.files || []).map((f) => ({
    filename: f.originalname,
    path: `/uploads/${f.filename}`,
    mimeType: f.mimetype,
    size: f.size
  }));

  const ticket = await Ticket.create({
    user: req.user._id,
    department: req.user.department,
    manager: req.user.manager,
    description,
    requestedItemCategory,
    quantity,
    priority,
    attachments
  });

  await logAction({ actor: req.user._id, action: 'CREATE_TICKET', module: 'Ticket', targetId: ticket._id, targetModel: 'Ticket' });

  if (ticket.manager) {
    await notifyUser({ recipient: ticket.manager, title: 'New ticket for approval', message: `${req.user.name} submitted ticket ${ticket.ticketNumber}`, type: 'ticket', link: `/tickets/${ticket._id}` });
  }
  await notifyRole('admin', { title: 'New ticket created', message: `${ticket.ticketNumber} - ${description.slice(0, 80)}`, link: `/tickets/${ticket._id}` });

  res.status(201).json({ success: true, data: ticket });
});

// PATCH /api/tickets/:id  - owner can update their own pending ticket only
exports.update = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const isOwner = ticket.user.toString() === req.user._id.toString();
  if (req.user.role === 'user') {
    if (!isOwner) throw new ApiError(403, 'You can only edit your own tickets');
    if (ticket.status !== 'Pending') throw new ApiError(400, 'Only pending tickets can be edited');
  } else if (req.user.role === 'manager' && ticket.department.toString() !== req.user.department.toString()) {
    throw new ApiError(403, 'This ticket is outside your department');
  }

  const allowed = ['description', 'priority', 'quantity'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) ticket[key] = req.body[key];
  });
  await ticket.save();

  res.json({ success: true, data: ticket });
});

// PATCH /api/tickets/:id/approve  (manager of same department, or admin)
exports.approve = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false }).populate('user', 'name email');
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (req.user.role === 'manager' && ticket.department.toString() !== req.user.department.toString()) {
    throw new ApiError(403, 'This ticket is outside your department');
  }
  if (ticket.status !== 'Pending') throw new ApiError(400, `Ticket cannot be approved from status '${ticket.status}'`);

  ticket.status = 'Manager Approved';
  await ticket.save();

  await logAction({ actor: req.user._id, action: 'APPROVE_TICKET', module: 'Ticket', targetId: ticket._id, targetModel: 'Ticket' });
  await notifyUser({ recipient: ticket.user._id, title: 'Ticket approved', message: `Your ticket ${ticket.ticketNumber} was approved`, type: 'ticket', link: `/tickets/${ticket._id}` });
  await notifyRole('admin', { title: 'Ticket ready for review', message: `${ticket.ticketNumber} approved by manager`, link: `/tickets/${ticket._id}` });

  res.json({ success: true, data: ticket });
});

// PATCH /api/tickets/:id/reject  (manager or admin)
exports.reject = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false }).populate('user', 'name email');
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (req.user.role === 'manager' && ticket.department.toString() !== req.user.department.toString()) {
    throw new ApiError(403, 'This ticket is outside your department');
  }
  if (!['Pending', 'Manager Approved'].includes(ticket.status)) {
    throw new ApiError(400, `Ticket cannot be rejected from status '${ticket.status}'`);
  }

  ticket.status = 'Manager Rejected';
  ticket.rejectionReason = rejectionReason;
  await ticket.save();

  await logAction({ actor: req.user._id, action: 'REJECT_TICKET', module: 'Ticket', targetId: ticket._id, targetModel: 'Ticket', description: rejectionReason });
  await notifyUser({ recipient: ticket.user._id, title: 'Ticket rejected', message: `Ticket ${ticket.ticketNumber} was rejected: ${rejectionReason}`, type: 'ticket', link: `/tickets/${ticket._id}` });

  res.json({ success: true, data: ticket });
});

// PATCH /api/tickets/:id/assign  (admin only) - assign to IT staff member for handling
exports.assign = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (ticket.status !== 'Manager Approved') throw new ApiError(400, 'Ticket must be manager-approved before assignment');

  ticket.status = 'Assigned';
  ticket.assignedTo = assignedTo;
  await ticket.save();

  await logAction({ actor: req.user._id, action: 'ASSIGN_TICKET', module: 'Ticket', targetId: ticket._id, targetModel: 'Ticket' });
  res.json({ success: true, data: ticket });
});

// PATCH /api/tickets/:id/resolve  (admin only) - after item(s) issued
exports.resolve = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false }).populate('user', 'name email');
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (ticket.status !== 'Issued') throw new ApiError(400, 'Ticket must have an item issued before it can be resolved');

  ticket.status = 'Resolved';
  ticket.resolvedAt = new Date();
  await ticket.save();

  await logAction({ actor: req.user._id, action: 'RESOLVE_TICKET', module: 'Ticket', targetId: ticket._id, targetModel: 'Ticket' });
  await notifyUser({ recipient: ticket.user._id, title: 'Ticket resolved', message: `Ticket ${ticket.ticketNumber} has been resolved`, type: 'ticket', link: `/tickets/${ticket._id}` });

  res.json({ success: true, data: ticket });
});

// PATCH /api/tickets/:id/close  (admin only)
exports.close = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (ticket.status !== 'Resolved') throw new ApiError(400, 'Only resolved tickets can be closed');

  ticket.status = 'Closed';
  ticket.closedAt = new Date();
  await ticket.save();

  await logAction({ actor: req.user._id, action: 'CLOSE_TICKET', module: 'Ticket', targetId: ticket._id, targetModel: 'Ticket' });
  res.json({ success: true, data: ticket });
});

// PATCH /api/tickets/:id/reopen  (admin, or owner within policy)
exports.reopen = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (!['Resolved', 'Closed'].includes(ticket.status)) throw new ApiError(400, 'Only resolved or closed tickets can be reopened');

  const isOwner = ticket.user.toString() === req.user._id.toString();
  if (req.user.role === 'user' && !isOwner) throw new ApiError(403, 'You can only reopen your own tickets');

  ticket.status = 'Reopened';
  await ticket.save();

  await logAction({ actor: req.user._id, action: 'REOPEN_TICKET', module: 'Ticket', targetId: ticket._id, targetModel: 'Ticket' });
  await notifyRole('admin', { title: 'Ticket reopened', message: `${ticket.ticketNumber} was reopened`, link: `/tickets/${ticket._id}` });

  res.json({ success: true, data: ticket });
});
