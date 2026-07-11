const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    template: { type: String }, // e.g. "item-issued", "ticket-approved"
    relatedTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    relatedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    status: { type: String, enum: ['Sent', 'Failed'], default: 'Sent' },
    error: { type: String },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailLog', emailLogSchema);
