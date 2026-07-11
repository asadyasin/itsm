const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Purchase = require('../models/Purchase');
const { logAction } = require('../services/auditService');

// GET /api/purchases
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, vendor, itemCategory } = req.query;
  const filter = { isDeleted: false };
  if (vendor) filter.vendor = vendor;
  if (itemCategory) filter.itemCategory = itemCategory;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Purchase.find(filter)
      .populate('itemCategory', 'name')
      .populate('vendor', 'name')
      .populate('createdBy', 'name')
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Purchase.countDocuments(filter)
  ]);

  res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
});

// GET /api/purchases/:id
exports.get = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, isDeleted: false })
    .populate('itemCategory', 'name')
    .populate('vendor', 'name');
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  res.json({ success: true, data: purchase });
});

// POST /api/purchases  (admin only) - Step 2 of inventory flow
exports.create = asyncHandler(async (req, res) => {
  const purchase = await Purchase.create({ ...req.body, createdBy: req.user._id });
  await logAction({
    actor: req.user._id,
    action: 'CREATE_PURCHASE',
    module: 'Inventory',
    targetId: purchase._id,
    targetModel: 'Purchase',
    description: `Recorded purchase of ${purchase.quantity} unit(s), invoice ${purchase.invoiceNo || 'N/A'}`
  });
  res.status(201).json({ success: true, data: purchase });
});

// PATCH /api/purchases/:id (admin only)
exports.update = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, req.body, { new: true, runValidators: true });
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  res.json({ success: true, data: purchase });
});
