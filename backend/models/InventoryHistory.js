const mongoose = require('mongoose');

const ACTIONS = ['Purchased', 'Added', 'Issued', 'Returned', 'Repaired', 'Lost', 'Scrapped', 'Reserved', 'Updated', 'Transferred'];

// Append-only: nothing here is ever updated or deleted (enforced at the service layer).
const inventoryHistorySchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    action: { type: String, enum: ACTIONS, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    relatedTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    notes: { type: String, trim: true }
  },
  { timestamps: { createdAt: 'dateTime', updatedAt: false } }
);

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);
module.exports.ACTIONS = ACTIONS;
