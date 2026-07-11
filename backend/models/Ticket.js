const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const STATUS_VALUES = [
  'Pending',
  'Manager Approved',
  'Manager Rejected',
  'Assigned',
  'Issued',
  'Resolved',
  'Closed',
  'Reopened'
];
const PRIORITY_VALUES = ['Low', 'Medium', 'High', 'Critical'];

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: PRIORITY_VALUES, default: 'Medium' },
    status: { type: String, enum: STATUS_VALUES, default: 'Pending', index: true },
    description: { type: String, required: true, trim: true },
    requestedItemCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    attachments: [{ filename: String, path: String, mimeType: String, size: Number }],
    assignedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // admin/IT staff handling it
    rejectionReason: { type: String, trim: true },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

ticketSchema.index({ description: 'text', ticketNumber: 'text' });

ticketSchema.pre('validate', function assignTicketNumber(next) {
  if (!this.ticketNumber) {
    this.ticketNumber = `TK-${nanoid(6).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
module.exports.PRIORITY_VALUES = PRIORITY_VALUES;
