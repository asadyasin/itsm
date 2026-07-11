const fs = require('fs');
const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const InventoryItem = require('../models/InventoryItem');
const Purchase = require('../models/Purchase');
const { recordHistory } = require('../services/inventoryHistoryService');
const { logAction } = require('../services/auditService');

// POST /api/inventory/bulk-import  (multipart file: .csv or .xlsx, expects columns: purchaseId, serialNumber, assetTag, warrantyExpiry)
exports.importInventory = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A CSV or Excel file is required');

  let rows = [];
  if (req.file.mimetype === 'text/csv') {
    const content = fs.readFileSync(req.file.path, 'utf8');
    rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];
    const headers = sheet.getRow(1).values.slice(1).map((h) => String(h).trim());
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values.slice(1);
      const record = {};
      headers.forEach((h, i) => (record[h] = values[i]));
      rows.push(record);
    });
  }

  const results = { created: 0, failed: [] };
  for (const [index, row] of rows.entries()) {
    try {
      const purchase = await Purchase.findById(row.purchaseId);
      if (!purchase) throw new Error('Purchase not found');
      const item = await InventoryItem.create({
        purchase: purchase._id,
        itemCategory: purchase.itemCategory,
        brand: purchase.brand,
        model: purchase.model,
        serialNumber: row.serialNumber,
        assetTag: row.assetTag || undefined,
        warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
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

  fs.unlink(req.file.path, () => {});
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
