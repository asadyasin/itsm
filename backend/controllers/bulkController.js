const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const InventoryItem = require('../models/InventoryItem');
const Purchase = require('../models/Purchase');
const Vendor = require('../models/Vendor');
const ItemCategory = require('../models/ItemCategory');
const Office = require('../models/Office');
const Department = require('../models/Department');
const User = require('../models/User');
const { parseUploadedRows, cleanupFile } = require('../utils/fileParser');
const { recordHistory } = require('../services/inventoryHistoryService');
const { logAction } = require('../services/auditService');

// ============================================================================
// Data migration / bulk-import endpoints. Each is intentionally "best effort":
// every row is processed independently, successes are kept, and failures are
// reported back with the row number + reason so a large migration file doesn't
// get thrown out entirely because a handful of rows had bad data.
// ============================================================================

// POST /api/vendors/bulk-import  (columns: name, contactPerson, phone, email)
// Upsert-by-name, so re-running the same migration file is always safe.
exports.importVendors = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A CSV or Excel file is required');
  const rows = await parseUploadedRows(req.file);
  cleanupFile(req.file);

  const results = { created: 0, updated: 0, failed: [] };
  for (const [index, row] of rows.entries()) {
    try {
      if (!row.name) throw new Error('Vendor name is required');
      const existing = await Vendor.findOne({ name: row.name });
      await Vendor.findOneAndUpdate(
        { name: row.name },
        { name: row.name, contactPerson: row.contactPerson || '', phone: row.phone || '', email: row.email || '' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (existing) results.updated += 1;
      else results.created += 1;
    } catch (err) {
      results.failed.push({ row: index + 2, error: err.message });
    }
  }

  await logAction({ actor: req.user._id, action: 'BULK_IMPORT_VENDORS', module: 'Inventory', description: `${results.created} created, ${results.updated} updated, ${results.failed.length} failed` });
  res.json({ success: true, data: results });
});

// POST /api/item-categories/bulk-import  (columns: name, description, lowStockThreshold)
exports.importCategories = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A CSV or Excel file is required');
  const rows = await parseUploadedRows(req.file);
  cleanupFile(req.file);

  const results = { created: 0, updated: 0, failed: [] };
  for (const [index, row] of rows.entries()) {
    try {
      if (!row.name) throw new Error('Category name is required');
      const existing = await ItemCategory.findOne({ name: row.name });
      await ItemCategory.findOneAndUpdate(
        { name: row.name },
        { name: row.name, description: row.description || '', lowStockThreshold: Number(row.lowStockThreshold) || 5 },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (existing) results.updated += 1;
      else results.created += 1;
    } catch (err) {
      results.failed.push({ row: index + 2, error: err.message });
    }
  }

  await logAction({ actor: req.user._id, action: 'BULK_IMPORT_CATEGORIES', module: 'Inventory', description: `${results.created} created, ${results.updated} updated, ${results.failed.length} failed` });
  res.json({ success: true, data: results });
});

// POST /api/purchases/bulk-import
// (columns: purchaseDate, category, vendor, office, brand, model, quantity, invoiceNo, unitPrice, description)
// Vendor and Category are auto-created if they don't already exist (common in a migration where the
// old system's naming won't line up 1:1). Office must already exist — created via the Offices page —
// since it drives auto-location for any serial numbers registered later.
exports.importPurchases = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A CSV or Excel file is required');
  const rows = await parseUploadedRows(req.file);
  cleanupFile(req.file);

  const results = { created: 0, failed: [] };
  for (const [index, row] of rows.entries()) {
    try {
      if (!row.category) throw new Error('Category is required');
      if (!row.vendor) throw new Error('Vendor is required');
      if (!row.office) throw new Error('Office is required');
      if (!row.quantity || Number(row.quantity) < 1) throw new Error('Quantity must be at least 1');

      const category = await ItemCategory.findOneAndUpdate(
        { name: row.category },
        { name: row.category },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const vendor = await Vendor.findOneAndUpdate(
        { name: row.vendor },
        { name: row.vendor },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const office = await Office.findOne({ name: row.office });
      if (!office) throw new Error(`Office "${row.office}" does not exist — create it first under Companies & Offices`);

      await Purchase.create({
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : new Date(),
        itemCategory: category._id,
        vendor: vendor._id,
        office: office._id,
        brand: row.brand || '',
        model: row.model || '',
        quantity: Number(row.quantity),
        invoiceNo: row.invoiceNo || '',
        unitPrice: Number(row.unitPrice) || 0,
        description: row.description || '',
        createdBy: req.user._id
      });
      results.created += 1;
    } catch (err) {
      results.failed.push({ row: index + 2, error: err.message });
    }
  }

  await logAction({ actor: req.user._id, action: 'BULK_IMPORT_PURCHASES', module: 'Inventory', description: `${results.created} created, ${results.failed.length} failed` });
  res.json({ success: true, data: results });
});

// POST /api/users/bulk-import  (columns: name, email, password, role, department)
// Create-only: existing emails are skipped (reported as failed rows) rather than silently
// overwritten, since this endpoint is meant for onboarding a staff directory, not editing one.
exports.importUsers = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A CSV or Excel file is required');
  const rows = await parseUploadedRows(req.file);
  cleanupFile(req.file);

  const results = { created: 0, failed: [] };
  for (const [index, row] of rows.entries()) {
    try {
      if (!row.name) throw new Error('Name is required');
      if (!row.email) throw new Error('Email is required');
      const existing = await User.findOne({ email: row.email.toLowerCase() });
      if (existing) throw new Error('A user with this email already exists — skipped');

      let departmentId = null;
      if (row.department) {
        const dept = await Department.findOne({ name: row.department });
        if (!dept) throw new Error(`Department "${row.department}" does not exist`);
        departmentId = dept._id;
      }

      await User.create({
        name: row.name,
        email: row.email.toLowerCase(),
        password: row.password && row.password.length >= 8 ? row.password : 'Welcome@12345',
        role: ['admin', 'manager', 'user'].includes(row.role) ? row.role : 'user',
        department: departmentId
      });
      results.created += 1;
    } catch (err) {
      results.failed.push({ row: index + 2, error: err.message });
    }
  }

  await logAction({ actor: req.user._id, action: 'BULK_IMPORT_USERS', module: 'User', description: `${results.created} created, ${results.failed.length} failed` });
  res.json({ success: true, data: results });
});

// POST /api/inventory/bulk-import
// (columns: purchaseId OR invoiceNo, serialNumber, assetTag, warrantyExpiry)
// Location/office are always auto-derived from the purchase's office — never taken from the file.
exports.importInventory = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A CSV or Excel file is required');
  const rows = await parseUploadedRows(req.file);
  cleanupFile(req.file);

  const results = { created: 0, failed: [] };
  for (const [index, row] of rows.entries()) {
    try {
      if (!row.serialNumber) throw new Error('Serial number is required');

      let purchase = null;
      if (row.purchaseId) purchase = await Purchase.findById(row.purchaseId);
      else if (row.invoiceNo) purchase = await Purchase.findOne({ invoiceNo: row.invoiceNo, isDeleted: false });
      if (!purchase) throw new Error('Purchase not found (provide a valid purchaseId or invoiceNo)');

      const alreadyRegistered = await InventoryItem.countDocuments({ purchase: purchase._id, isDeleted: false });
      if (alreadyRegistered >= purchase.quantity) {
        throw new Error(`Purchase already has all ${purchase.quantity} unit(s) registered`);
      }

      const dupe = await InventoryItem.findOne({ serialNumber: row.serialNumber });
      if (dupe) throw new Error('Serial number already exists in inventory');

      const office = purchase.office ? await Office.findById(purchase.office).select('name location') : null;

      const item = await InventoryItem.create({
        purchase: purchase._id,
        itemCategory: purchase.itemCategory,
        brand: purchase.brand,
        model: purchase.model,
        serialNumber: row.serialNumber,
        assetTag: row.assetTag || undefined,
        warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
        office: office?._id || null,
        location: office?.location || '',
        status: 'Available'
      });
      item.qrCodeData = `ITEM:${item._id}:${item.serialNumber}`;
      await item.save();
      await recordHistory({ item: item._id, action: 'Added', performedBy: req.user._id, notes: 'Bulk import' });
      results.created += 1;
    } catch (err) {
      results.failed.push({ row: index + 2, error: err.message });
    }
  }

  await logAction({ actor: req.user._id, action: 'BULK_IMPORT_INVENTORY', module: 'Inventory', description: `Imported ${results.created} item(s), ${results.failed.length} failed` });
  res.json({ success: true, data: results });
});

// GET /api/inventory/bulk-export?format=csv|xlsx
exports.exportInventory = asyncHandler(async (req, res) => {
  const { format = 'xlsx' } = req.query;
  const items = await InventoryItem.find({ isDeleted: false })
    .populate('itemCategory', 'name')
    .populate('currentUser', 'name email');

  const rows = items.map((it) => ({
    SerialNumber: it.serialNumber,
    AssetTag: it.assetTag || '',
    Category: it.itemCategory?.name || '',
    Brand: it.brand || '',
    Model: it.model || '',
    Status: it.status,
    IssuedTo: it.currentUser?.name || '',
    WarrantyExpiry: it.warrantyExpiry ? it.warrantyExpiry.toISOString().slice(0, 10) : ''
  }));

  if (format === 'csv') {
    const { stringify } = require('csv-stringify/sync');
    const csv = stringify(rows, { header: true });
    res.header('Content-Type', 'text/csv');
    res.attachment('inventory-export.csv');
    return res.send(csv);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventory');
  sheet.columns = Object.keys(rows[0] || { SerialNumber: '' }).map((key) => ({ header: key, key, width: 20 }));
  sheet.addRows(rows);

  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment('inventory-export.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});
