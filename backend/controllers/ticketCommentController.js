const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Ticket = require('../models/Ticket');
const TicketComment = require('../models/TicketComment');
const { notifyUser } = require('../services/notificationService');

// GET /api/tickets/:ticketId/comments
exports.list = asyncHandler(async (req, res) => {
  const filter = { ticket: req.params.ticketId };
  if (req.user.role === 'user') filter.isInternal = false; // users never see internal notes
  const comments = await TicketComment.find(filter).populate('author', 'name role').sort({ createdAt: 1 });
  res.json({ success: true, data: comments });
});

// POST /api/tickets/:ticketId/comments
exports.create = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.ticketId, isDeleted: false });
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const isInternal = req.user.role !== 'user' && !!req.body.isInternal;
  const comment = await TicketComment.create({ ticket: ticket._id, author: req.user._id, message: req.body.message, isInternal });

  if (!isInternal && ticket.user.toString() !== req.user._id.toString()) {
    await notifyUser({ recipient: ticket.user, title: 'New comment on your ticket', message: `${req.user.name} commented on ${ticket.ticketNumber}`, type: 'ticket', link: `/tickets/${ticket._id}` });
  }

  res.status(201).json({ success: true, data: comment });
});
