const mongoose = require('mongoose');

const ticketCommentSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    isInternal: { type: Boolean, default: false } // internal notes visible to admin/manager only
  },
  { timestamps: true }
);

module.exports = mongoose.model('TicketComment', ticketCommentSchema);
