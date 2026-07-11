const mongoose = require('mongoose');

// Supports future multi-company / multi-branch expansion.
// All key collections (Users, Inventory, Tickets) can optionally scope to a branch.
const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', branchSchema);
