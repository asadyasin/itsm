const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');
const Ticket = require('../models/Ticket');
const Vendor = require('../models/Vendor');

// GET /api/search?q=...
// Searches: User, Asset (serial/model/brand), Serial Number, Ticket Number, Vendor, Model, Invoice Number
exports.globalSearch = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return res.json({ success: true, data: { users: [], assets: [], tickets: [], vendors: [] } });

  const regex = new RegExp(q, 'i');

  const [users, assets, tickets, vendors] = await Promise.all([
    req.user.role === 'admin'
      ? User.find({ isDeleted: false, $or: [{ name: regex }, { email: regex }] }).limit(10).select('name email role')
      : [],
    InventoryItem.find({ isDeleted: false, $or: [{ serialNumber: regex }, { assetTag: regex }, { model: regex }, { brand: regex }] })
      .limit(10)
      .populate('itemCategory', 'name'),
    Ticket.find({ isDeleted: false, $or: [{ ticketNumber: regex }, { description: regex }] }).limit(10),
    req.user.role === 'admin' ? Vendor.find({ isActive: true, $or: [{ name: regex }] }).limit(10) : []
  ]);

  res.json({ success: true, data: { users, assets, tickets, vendors } });
});
