const mongoose = require('mongoose');

// Generic append-only audit trail for every write action across the system
// (separate from InventoryHistory, which is asset-specific and user-facing).
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. "ISSUE_ITEM", "APPROVE_TICKET", "CREATE_USER"
    module: { type: String, required: true }, // "Inventory" | "Ticket" | "User" | "Auth"
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    targetModel: { type: String, default: null },
    description: { type: String, trim: true },
    ip: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
