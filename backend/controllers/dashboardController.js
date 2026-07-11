const asyncHandler = require('../utils/asyncHandler');
const InventoryItem = require('../models/InventoryItem');
const ItemCategory = require('../models/ItemCategory');
const Ticket = require('../models/Ticket');
const Purchase = require('../models/Purchase');

function scopeFilterForUser(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'manager') return { department: user.department };
  return { user: user._id };
}

// GET /api/dashboard/summary
exports.summary = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';

  const [totalAssets, availableAssets, issuedAssets, repairAssets] = await Promise.all([
    InventoryItem.countDocuments({ isDeleted: false }),
    InventoryItem.countDocuments({ isDeleted: false, status: 'Available' }),
    InventoryItem.countDocuments({ isDeleted: false, status: 'Issued' }),
    InventoryItem.countDocuments({ isDeleted: false, status: 'Repair' })
  ]);

  const ticketFilter = { isDeleted: false, ...scopeFilterForUser(req.user) };
  const [totalTickets, pendingTickets, closedTickets] = await Promise.all([
    Ticket.countDocuments(ticketFilter),
    Ticket.countDocuments({ ...ticketFilter, status: { $in: ['Pending', 'Manager Approved', 'Assigned'] } }),
    Ticket.countDocuments({ ...ticketFilter, status: 'Closed' })
  ]);

  let lowStockItems = 0;
  if (isAdmin) {
    const categories = await ItemCategory.find({ isActive: true });
    const counts = await InventoryItem.aggregate([
      { $match: { isDeleted: false, status: 'Available' } },
      { $group: { _id: '$itemCategory', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
    lowStockItems = categories.filter((cat) => (countMap[cat._id.toString()] || 0) <= cat.lowStockThreshold).length;
  }

  res.json({
    success: true,
    data: {
      totalAssets,
      availableAssets,
      issuedAssets,
      repairAssets,
      totalTickets,
      pendingTickets,
      closedTickets,
      lowStockItems
    }
  });
});

// GET /api/dashboard/charts
exports.charts = asyncHandler(async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [monthlyPurchases, monthlyTickets, inventoryDistribution, vendorStats] = await Promise.all([
    Purchase.aggregate([
      { $match: { isDeleted: false, purchaseDate: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: '$purchaseDate' }, m: { $month: '$purchaseDate' } }, totalQuantity: { $sum: '$quantity' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]),
    Ticket.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: sixMonthsAgo }, ...scopeFilterForUser(req.user) } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]),
    InventoryItem.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$itemCategory', count: { $sum: 1 } } },
      { $lookup: { from: 'itemcategories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, category: '$category.name', count: 1 } }
    ]),
    Purchase.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$vendor', totalQuantity: { $sum: '$quantity' }, totalSpend: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } },
      { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
      { $unwind: '$vendor' },
      { $project: { _id: 0, vendor: '$vendor.name', totalQuantity: 1, totalSpend: 1 } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ])
  ]);

  res.json({ success: true, data: { monthlyPurchases, monthlyTickets, inventoryDistribution, vendorStats } });
});
