const QRCode = require('qrcode');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const InventoryItem = require('../models/InventoryItem');
const Purchase = require('../models/Purchase');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { recordHistory } = require('../services/inventoryHistoryService');
const { logAction } = require('../services/auditService');
const { sendTemplateEmail } = require('../services/emailService');
const { notifyUser } = require('../services/notificationService');
const InventoryHistory = require('../models/InventoryHistory');

// GET /api/inventory/items  - list with filters (category, vendor via purchase, status, brand, model) + global search
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, itemCategory, brand, model, search } = req.query;
  const filter = { isDeleted: false };
  if (req.user.role === 'user') filter.currentUser = req.user._id;
  else if (req.user.role === 'manager' && req.query.myTeamOnly !== 'false') {
    // Managers see everything by default in this view; scope to team via a dedicated endpoint/query if needed.
  }
  if (status) filter.status = status;
  if (itemCategory) filter.itemCategory = itemCategory;
  if (brand) filter.brand = new RegExp(brand, 'i');
  if (model) filter.model = new RegExp(model, 'i');
  if (search) filter.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .populate('itemCategory', 'name')
      .populate('currentUser', 'name email')
      .populate({ path: 'purchase', populate: { path: 'vendor', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    InventoryItem.countDocuments(filter)
  ]);

  res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
});

// GET /api/inventory/items/:id  - full detail + timeline
exports.get = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false })
    .populate('itemCategory', 'name')
    .populate('currentUser', 'name email')
    .populate({ path: 'purchase', populate: { path: 'vendor', select: 'name' } });
  if (!item) throw new ApiError(404, 'Inventory item not found');

  const history = await InventoryHistory.find({ item: item._id })
    .populate('performedBy', 'name')
    .populate('targetUser', 'name')
    .sort({ dateTime: -1 });

  res.json({ success: true, data: { item, history } });
});

// POST /api/inventory/items  - Step 3: register individual serial numbers against a purchase (single or bulk)
exports.createUnits = asyncHandler(async (req, res) => {
  const { purchaseId, units } = req.body; // units: [{ serialNumber, assetTag?, warrantyExpiry? }]
  const purchase = await Purchase.findOne({ _id: purchaseId, isDeleted: false });
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  if (!Array.isArray(units) || units.length === 0) throw new ApiError(400, 'At least one serial number is required');

  const created = [];
  for (const unit of units) {
    const item = await InventoryItem.create({
      purchase: purchase._id,
      itemCategory: purchase.itemCategory,
      brand: purchase.brand,
      model: purchase.model,
      serialNumber: unit.serialNumber,
      assetTag: unit.assetTag,
      warrantyExpiry: unit.warrantyExpiry || null,
      status: 'Available'
    });
    item.qrCodeData = `ITEM:${item._id}:${item.serialNumber}`;
    await item.save();

    await recordHistory({ item: item._id, action: 'Added', performedBy: req.user._id, notes: `Registered from purchase ${purchase.invoiceNo || purchase._id}` });
    created.push(item);
  }

  await logAction({ actor: req.user._id, action: 'ADD_INVENTORY_UNITS', module: 'Inventory', targetId: purchase._id, targetModel: 'Purchase', description: `Added ${created.length} unit(s)` });

  res.status(201).json({ success: true, data: created });
});

// GET /api/inventory/items/:id/qrcode - returns a PNG data URL for printing/scanning
exports.getQrCode = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');
  const dataUrl = await QRCode.toDataURL(item.qrCodeData || `ITEM:${item._id}`);
  res.json({ success: true, data: { qrCodeImage: dataUrl } });
});

// POST /api/inventory/items/issue  - Admin issues an approved/available item to a user, optionally linked to a ticket
exports.issueItem = asyncHandler(async (req, res) => {
  const { itemId, ticketId, userId, sendEmail } = req.body;

  const item = await InventoryItem.findOne({ _id: itemId, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');
  if (!['Available', 'Reserved'].includes(item.status)) {
    throw new ApiError(400, `Item is currently '${item.status}' and cannot be issued`);
  }

  const recipient = await User.findOne({ _id: userId, isDeleted: false });
  if (!recipient) throw new ApiError(404, 'Recipient user not found');

  let ticket = null;
  if (ticketId) {
    ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    if (!['Manager Approved', 'Assigned'].includes(ticket.status)) {
      throw new ApiError(400, `Ticket must be approved before issuing an item (current status: ${ticket.status})`);
    }
  }

  item.status = 'Issued';
  item.currentUser = recipient._id;
  item.currentTicket = ticket ? ticket._id : null;
  await item.save();

  await recordHistory({
    item: item._id,
    action: 'Issued',
    performedBy: req.user._id,
    targetUser: recipient._id,
    relatedTicket: ticket ? ticket._id : null,
    notes: ticket ? `Issued against ticket ${ticket.ticketNumber}` : 'Issued directly'
  });

  if (ticket) {
    ticket.status = 'Issued';
    ticket.assignedItems.push(item._id);
    await ticket.save();
  }

  await logAction({
    actor: req.user._id,
    action: 'ISSUE_ITEM',
    module: 'Inventory',
    targetId: item._id,
    targetModel: 'InventoryItem',
    description: `Issued serial ${item.serialNumber} to ${recipient.email}`
  });

  await notifyUser({
    recipient: recipient._id,
    title: 'Inventory item issued',
    message: `A ${item.model || ''} (S/N ${item.serialNumber}) has been issued to you.`,
    type: 'inventory',
    link: `/inventory/items/${item._id}`
  });

  if (sendEmail) {
    await sendTemplateEmail({
      to: recipient.email,
      template: 'item-issued',
      relatedItem: item._id,
      relatedTicket: ticket ? ticket._id : null,
      sentBy: req.user._id,
      data: {
        userName: recipient.name,
        ticketNumber: ticket ? ticket.ticketNumber : null,
        itemCategory: item.model || 'Item',
        brand: item.brand,
        model: item.model,
        serialNumber: item.serialNumber,
        issueDate: new Date().toDateString()
      }
    });
  }

  res.json({ success: true, data: item });
});

// POST /api/inventory/items/return  - Admin returns an issued item back to stock
exports.returnItem = asyncHandler(async (req, res) => {
  const { itemId, notes } = req.body;
  const item = await InventoryItem.findOne({ _id: itemId, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');
  if (item.status !== 'Issued') throw new ApiError(400, `Only issued items can be returned (current status: ${item.status})`);

  const previousUser = item.currentUser;
  const ticket = item.currentTicket ? await Ticket.findById(item.currentTicket) : null;

  item.status = 'Available';
  item.currentUser = null;
  item.currentTicket = null;
  await item.save();

  await recordHistory({
    item: item._id,
    action: 'Returned',
    performedBy: req.user._id,
    targetUser: previousUser,
    relatedTicket: ticket ? ticket._id : null,
    notes: notes || 'Returned to inventory'
  });

  await logAction({ actor: req.user._id, action: 'RETURN_ITEM', module: 'Inventory', targetId: item._id, targetModel: 'InventoryItem' });

  res.json({ success: true, data: item });
});

// POST /api/inventory/items/:id/transfer  - Move an issued asset from one user/department to another
exports.transferItem = asyncHandler(async (req, res) => {
  const { toUserId, notes } = req.body;
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');
  if (item.status !== 'Issued') throw new ApiError(400, 'Only issued items can be transferred');

  const toUser = await User.findOne({ _id: toUserId, isDeleted: false });
  if (!toUser) throw new ApiError(404, 'Target user not found');

  const fromUserId = item.currentUser;
  item.currentUser = toUser._id;
  await item.save();

  await recordHistory({ item: item._id, action: 'Transferred', performedBy: req.user._id, targetUser: toUser._id, notes: notes || `Transferred from previous holder` });
  await logAction({ actor: req.user._id, action: 'TRANSFER_ITEM', module: 'Inventory', targetId: item._id, targetModel: 'InventoryItem', metadata: { fromUserId, toUserId } });

  res.json({ success: true, data: item });
});

// POST /api/inventory/items/:id/scrap  - Retire a damaged/obsolete asset permanently
exports.scrapItem = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');

  item.status = 'Scrapped';
  item.currentUser = null;
  item.currentTicket = null;
  await item.save();

  await recordHistory({ item: item._id, action: 'Scrapped', performedBy: req.user._id, notes: notes || 'Retired from service' });
  await logAction({ actor: req.user._id, action: 'SCRAP_ITEM', module: 'Inventory', targetId: item._id, targetModel: 'InventoryItem' });

  res.json({ success: true, data: item });
});

// PATCH /api/inventory/items/:id/status  - generic status update, e.g. mark Repair / Lost / Reserved
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');

  item.status = status;
  await item.save();

  const actionMap = { Repair: 'Repaired', Lost: 'Lost', Reserved: 'Reserved' };
  await recordHistory({ item: item._id, action: actionMap[status] || 'Updated', performedBy: req.user._id, notes });
  await logAction({ actor: req.user._id, action: 'UPDATE_ITEM_STATUS', module: 'Inventory', targetId: item._id, targetModel: 'InventoryItem', metadata: { status } });

  res.json({ success: true, data: item });
});
