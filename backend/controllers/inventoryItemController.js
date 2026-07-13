const QRCode = require('qrcode');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const InventoryItem = require('../models/InventoryItem');
const Purchase = require('../models/Purchase');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const ItemCategory = require('../models/ItemCategory');
const { recordHistory } = require('../services/inventoryHistoryService');
const { logAction } = require('../services/auditService');
const { sendTemplateEmail } = require('../services/emailService');
const { notifyUser } = require('../services/notificationService');
const InventoryHistory = require('../models/InventoryHistory');
const orgConfig = require('../config/orgConfig');

// Builds the human-meaningful payload embedded in each asset's QR code.
// A scanner (phone camera, dedicated scanner app, etc.) reading this gets enough
// context to identify the asset without a network lookup, plus the item ID so the
// issue/return workflow can look it up directly.
function buildQrPayload(item, categoryName) {
  const lines = [
    `Company: ${orgConfig.orgName}`,
    `Asset Tag: ${item.assetTag || 'N/A'}`,
    `Category: ${categoryName || 'N/A'}`,
    `Brand/Model: ${[item.brand, item.model].filter(Boolean).join(' ') || 'N/A'}`,
    `Serial Number: ${item.serialNumber}`,
    `Location: ${item.location || orgConfig.defaultLocation}`,
    `Item ID: ${item._id}`
  ];
  return lines.join('\n');
}

async function regenerateQrCode(item) {
  const category = await ItemCategory.findById(item.itemCategory).select('name');
  item.qrCodeData = buildQrPayload(item, category?.name);
  return item;
}

// GET /api/inventory/items  - list with filters (category, vendor via purchase, status, brand, model) + global search
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, itemCategory, brand, model, search } = req.query;
  const filter = { isDeleted: false };

  if (req.user.role === 'user') {
    // Regular users only ever see items currently issued to them.
    filter.currentUser = req.user._id;
  } else if (req.user.role === 'manager') {
    // Managers only see items issued to someone in their own department (including themselves) —
    // never the full org-wide inventory catalog.
    const teamUsers = await User.find({ department: req.user.department, isDeleted: false }).select('_id');
    filter.currentUser = { $in: teamUsers.map((u) => u._id) };
  }
  // Admins see everything (no additional scoping).

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
  const filter = { _id: req.params.id, isDeleted: false };

  if (req.user.role === 'user') {
    filter.currentUser = req.user._id;
  } else if (req.user.role === 'manager') {
    const teamUsers = await User.find({ department: req.user.department, isDeleted: false }).select('_id');
    filter.currentUser = { $in: teamUsers.map((u) => u._id) };
  }

  const item = await InventoryItem.findOne(filter)
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
// Enforces two integrity rules the person specifically asked for:
//   1. Total registered serials for a purchase can never exceed the purchased quantity.
//   2. A serial number can never be registered twice — checked both within this submission
//      and against everything already in inventory — with a clear error before anything is saved.
exports.createUnits = asyncHandler(async (req, res) => {
  const { purchaseId, units } = req.body; // units: [{ serialNumber, assetTag?, warrantyExpiry?, location? }]
  const purchase = await Purchase.findOne({ _id: purchaseId, isDeleted: false });
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  if (!Array.isArray(units) || units.length === 0) throw new ApiError(400, 'At least one serial number is required');

  const cleanUnits = units
    .map((u) => ({ ...u, serialNumber: (u.serialNumber || '').trim(), assetTag: u.assetTag ? String(u.assetTag).trim() : undefined }))
    .filter((u) => u.serialNumber);
  if (cleanUnits.length === 0) throw new ApiError(400, 'At least one serial number is required');

  // Rule 1: don't let registered units exceed the purchased quantity.
  const alreadyRegistered = await InventoryItem.countDocuments({ purchase: purchase._id, isDeleted: false });
  const remaining = purchase.quantity - alreadyRegistered;
  if (cleanUnits.length > remaining) {
    throw new ApiError(
      400,
      remaining > 0
        ? `This purchase is for ${purchase.quantity} unit(s); ${alreadyRegistered} already registered, so only ${remaining} more can be added. You submitted ${cleanUnits.length}.`
        : `All ${purchase.quantity} unit(s) from this purchase have already been registered with serial numbers.`
    );
  }

  // Rule 2a: no duplicates within this submission itself.
  const serialCounts = {};
  cleanUnits.forEach((u) => { serialCounts[u.serialNumber] = (serialCounts[u.serialNumber] || 0) + 1; });
  const dupesInBatch = Object.keys(serialCounts).filter((s) => serialCounts[s] > 1);
  if (dupesInBatch.length) {
    throw new ApiError(400, `Duplicate serial number(s) in this submission: ${dupesInBatch.join(', ')}`);
  }

  // Rule 2b: no serial number that already exists anywhere in inventory (deleted or not — serials are unique forever).
  const serials = cleanUnits.map((u) => u.serialNumber);
  const existing = await InventoryItem.find({ serialNumber: { $in: serials } }).select('serialNumber');
  if (existing.length) {
    const list = existing.map((e) => e.serialNumber).join(', ');
    throw new ApiError(409, `Serial number(s) already exist in inventory: ${list}`);
  }

  // Same check for asset tags, if provided.
  const assetTags = cleanUnits.map((u) => u.assetTag).filter(Boolean);
  if (assetTags.length) {
    const existingTags = await InventoryItem.find({ assetTag: { $in: assetTags } }).select('assetTag');
    if (existingTags.length) {
      throw new ApiError(409, `Asset tag(s) already in use: ${existingTags.map((e) => e.assetTag).join(', ')}`);
    }
  }

  const category = await ItemCategory.findById(purchase.itemCategory).select('name');

  const created = [];
  for (const unit of cleanUnits) {
    const item = await InventoryItem.create({
      purchase: purchase._id,
      itemCategory: purchase.itemCategory,
      brand: purchase.brand,
      model: purchase.model,
      serialNumber: unit.serialNumber,
      assetTag: unit.assetTag,
      warrantyExpiry: unit.warrantyExpiry || null,
      location: unit.location || '',
      status: 'Available'
    });
    item.qrCodeData = buildQrPayload(item, category?.name);
    await item.save();

    await recordHistory({ item: item._id, action: 'Added', performedBy: req.user._id, notes: `Registered from purchase ${purchase.invoiceNo || purchase._id}` });
    created.push(item);
  }

  await logAction({ actor: req.user._id, action: 'ADD_INVENTORY_UNITS', module: 'Inventory', targetId: purchase._id, targetModel: 'Purchase', description: `Added ${created.length} unit(s)` });

  res.status(201).json({ success: true, data: created });
});

// PATCH /api/inventory/items/:id  - edit asset details (brand/model/assetTag/location/warrantyExpiry/notes)
// Regenerates the QR payload since it embeds these fields.
exports.updateItem = asyncHandler(async (req, res) => {
  const allowed = ['brand', 'model', 'assetTag', 'location', 'warrantyExpiry', 'notes'];
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');

  const changes = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      changes[key] = req.body[key];
      item[key] = req.body[key] === '' ? null : req.body[key];
    }
  });

  await regenerateQrCode(item);
  await item.save();

  await recordHistory({
    item: item._id,
    action: 'Updated',
    performedBy: req.user._id,
    notes: `Updated fields: ${Object.keys(changes).join(', ') || 'none'}`
  });
  await logAction({ actor: req.user._id, action: 'UPDATE_ITEM_DETAILS', module: 'Inventory', targetId: item._id, targetModel: 'InventoryItem', metadata: changes });

  res.json({ success: true, data: item });
});

// GET /api/inventory/items/:id/qrcode - returns a PNG data URL for printing/scanning
exports.getQrCode = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');
  if (!item.qrCodeData) {
    await regenerateQrCode(item);
    await item.save();
  }
  const dataUrl = await QRCode.toDataURL(item.qrCodeData, { errorCorrectionLevel: 'M', margin: 1, width: 320 });
  res.json({ success: true, data: { qrCodeImage: dataUrl, qrCodeText: item.qrCodeData } });
});

// POST /api/inventory/items/issue  - Admin issues an item to a user against an approved ticket.
// A ticket is mandatory: items are never issued outside the ticket workflow (request -> approve -> issue).
exports.issueItem = asyncHandler(async (req, res) => {
  const { itemId, ticketId, userId, sendEmail } = req.body;

  if (!ticketId) {
    throw new ApiError(400, 'An approved ticket is required to issue an item.');
  }

  const item = await InventoryItem.findOne({ _id: itemId, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');
  if (!['Available', 'Reserved'].includes(item.status)) {
    throw new ApiError(400, `Item is currently '${item.status}' and cannot be issued`);
  }

  const recipient = await User.findOne({ _id: userId, isDeleted: false });
  if (!recipient) throw new ApiError(404, 'Recipient user not found');

  const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (!['Manager Approved', 'Assigned'].includes(ticket.status)) {
    throw new ApiError(400, `Ticket must be approved before issuing an item (current status: ${ticket.status})`);
  }
  if (ticket.user.toString() !== recipient._id.toString()) {
    throw new ApiError(400, 'The selected ticket does not belong to the selected recipient.');
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

// PATCH /api/inventory/items/:id/status  - generic status change, e.g. Available -> Repair, Repair -> Available,
// Scrapped -> Available (restore a repaired asset), mark Lost/Reserved, etc.
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw new ApiError(404, 'Inventory item not found');

  if (status === 'Issued') {
    throw new ApiError(400, "Use the 'Issue Item' action to assign this asset to a user, not a direct status change.");
  }
  if (item.status === 'Issued' && status !== 'Available') {
    throw new ApiError(400, 'Return the item first before changing its status.');
  }

  const previousStatus = item.status;
  item.status = status;
  // Moving out of Issued/Reserved into any other state clears the current holder.
  if (['Available', 'Repair', 'Scrapped', 'Lost'].includes(status)) {
    item.currentUser = null;
    item.currentTicket = null;
  }
  await item.save();

  const actionMap = { Repair: 'Repaired', Lost: 'Lost', Reserved: 'Reserved', Scrapped: 'Scrapped', Available: 'Updated' };
  const defaultNote = previousStatus === 'Scrapped' && status !== 'Scrapped'
    ? `Restored from Scrapped to ${status}`
    : notes;

  await recordHistory({ item: item._id, action: actionMap[status] || 'Updated', performedBy: req.user._id, notes: defaultNote || notes });
  await logAction({ actor: req.user._id, action: 'UPDATE_ITEM_STATUS', module: 'Inventory', targetId: item._id, targetModel: 'InventoryItem', metadata: { from: previousStatus, to: status } });

  res.json({ success: true, data: item });
});
