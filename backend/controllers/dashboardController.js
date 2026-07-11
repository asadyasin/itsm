const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const InventoryItem = require('../models/InventoryItem');
const ItemCategory = require('../models/ItemCategory');
const Ticket = require('../models/Ticket');
const Purchase = require('../models/Purchase');
const User = require('../models/User');

function ticketScopeForUser(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'manager') return { department: user.department };
  return { user: user._id };
}

// Items currently issued to a given set of user IDs, grouped by category name.
async function issuedItemBreakdown(userIds) {
  const rows = await InventoryItem.aggregate([
    { $match: { isDeleted: false, status: 'Issued', currentUser: { $in: userIds } } },
    { $group: { _id: '$itemCategory', count: { $sum: 1 } } },
    { $lookup: { from: 'itemcategories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $project: { _id: 0, category: '$category.name', count: 1 } },
    { $sort: { category: 1 } }
  ]);
  return rows;
}

// GET /api/dashboard/summary
// Response shape intentionally differs by role:
//   admin   -> org-wide asset counts + ticket counts + low stock
//   manager -> team's issued-item breakdown + department-scoped ticket counts (no org-wide asset totals)
//   user    -> own issued-item breakdown + own ticket counts (no asset totals at all)
exports.summary = asyncHandler(async (req, res) => {
  const ticketFilter = { isDeleted: false, ...ticketScopeForUser(req.user) };
  const [totalTickets, pendingTickets, closedTickets] = await Promise.all([
    Ticket.countDocuments(ticketFilter),
    Ticket.countDocuments({ ...ticketFilter, status: { $in: ['Pending', 'Manager Approved', 'Assigned'] } }),
    Ticket.countDocuments({ ...ticketFilter, status: 'Closed' })
  ]);

  if (req.user.role === 'admin') {
    const [totalAssets, availableAssets, issuedAssets, repairAssets] = await Promise.all([
      InventoryItem.countDocuments({ isDeleted: false }),
      InventoryItem.countDocuments({ isDeleted: false, status: 'Available' }),
      InventoryItem.countDocuments({ isDeleted: false, status: 'Issued' }),
      InventoryItem.countDocuments({ isDeleted: false, status: 'Repair' })
    ]);

    const categories = await ItemCategory.find({ isActive: true });
    const counts = await InventoryItem.aggregate([
      { $match: { isDeleted: false, status: 'Available' } },
      { $group: { _id: '$itemCategory', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
    const lowStockItems = categories.filter((cat) => (countMap[cat._id.toString()] || 0) <= cat.lowStockThreshold).length;

    return res.json({
      success: true,
      data: { role: 'admin', totalAssets, availableAssets, issuedAssets, repairAssets, totalTickets, pendingTickets, closedTickets, lowStockItems }
    });
  }

  if (req.user.role === 'manager') {
    const teamUsers = await User.find({ department: req.user.department, isDeleted: false }).select('_id');
    const teamUserIds = teamUsers.map((u) => u._id);
    const teamIssuedItems = await issuedItemBreakdown(teamUserIds);

    return res.json({
      success: true,
      data: { role: 'manager', teamIssuedItems, totalTickets, pendingTickets, closedTickets }
    });
  }

  // regular user
  const myIssuedItems = await issuedItemBreakdown([req.user._id]);
  res.json({
    success: true,
    data: { role: 'user', myIssuedItems, totalTickets, pendingTickets, closedTickets }
  });
});

// GET /api/dashboard/charts - admin only (enforced at the route level too)
exports.charts = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Charts are only available to administrators.');
  }

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
      { $match: { isDeleted: false, createdAt: { $gte: sixMonthsAgo } } },
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
