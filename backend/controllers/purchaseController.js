const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Purchase = require('../models/Purchase');
const InventoryItem = require('../models/InventoryItem');
const { recordHistory } = require('../services/inventoryHistoryService');
const { logAction } = require('../services/auditService');

// GET /api/purchases
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, vendor, itemCategory, office } = req.query;
  const filter = { isDeleted: false };
  if (vendor) filter.vendor = vendor;
  if (itemCategory) filter.itemCategory = itemCategory;
  if (office) filter.office = office;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Purchase.find(filter)
      .populate('itemCategory', 'name')
      .populate('vendor', 'name')
      .populate('office', 'name location')
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
    .populate('vendor', 'name')
    .populate('office', 'name location');
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

// DELETE /api/purchases/:id (admin only, soft delete)
// Cascades to every InventoryItem unit registered against this purchase — they are soft-deleted too
// (never hard-deleted; their history stays intact), UNLESS any of them is currently Issued, in which
// case the whole deletion is blocked until those items are returned first.
exports.remove = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id });
  if (!purchase) throw new ApiError(404, 'Purchase not found');

  const linkedItems = await InventoryItem.find({ purchase: purchase._id, isDeleted: false });
  const issuedItems = linkedItems.filter((i) => i.status === 'Issued');
  if (issuedItems.length > 0) {
    throw new ApiError(
      400,
      `Cannot delete this purchase: ${issuedItems.length} unit(s) are currently issued (${issuedItems.map((i) => i.serialNumber).join(', ')}). Return them first.`
    );
  }

  purchase.isDeleted = true;
  await purchase.save();

  for (const item of linkedItems) {
    item.isDeleted = true;
    await item.save();
    await recordHistory({
      item: item._id,
      action: 'Updated',
      performedBy: req.user._id,
      notes: 'Removed from inventory — the purchase record it was registered under was deleted'
    });
  }

  await logAction({
    actor: req.user._id,
    action: 'DELETE_PURCHASE',
    module: 'Inventory',
    targetId: purchase._id,
    targetModel: 'Purchase',
    description: `Deleted purchase and cascaded to ${linkedItems.length} linked unit(s)`
  });

  res.json({ success: true, message: `Purchase removed along with ${linkedItems.length} linked serial number(s).` });
});
