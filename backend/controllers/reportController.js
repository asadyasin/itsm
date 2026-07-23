const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const InventoryItem = require('../models/InventoryItem');
const InventoryHistory = require('../models/InventoryHistory');
const Ticket = require('../models/Ticket');
const Purchase = require('../models/Purchase');

const REPORT_TYPES = ['issued-assets', 'returned-assets', 'vendor-purchases', 'user-inventory', 'tickets'];

async function buildRows(type, query) {
  switch (type) {
    case 'issued-assets': {
      const items = await InventoryItem.find({ isDeleted: false, status: 'Issued' })
        .populate('itemCategory', 'name')
        .populate('currentUser', 'name email');
      return items.map((i) => ({
        Serial: i.serialNumber,
        Category: i.itemCategory?.name,
        Brand: i.brand,
        Model: i.model,
        IssuedTo: i.currentUser?.name,
        Email: i.currentUser?.email
      }));
    }
    case 'returned-assets': {
      const returns = await InventoryHistory.find({ action: 'Returned' })
        .populate({ path: 'item', populate: { path: 'itemCategory', select: 'name' } })
        .populate('targetUser', 'name')
        .sort({ dateTime: -1 });
      return returns.map((r) => ({
        Serial: r.item?.serialNumber,
        Category: r.item?.itemCategory?.name,
        ReturnedBy: r.targetUser?.name,
        Date: r.dateTime?.toISOString().slice(0, 10)
      }));
    }
    case 'vendor-purchases': {
      const purchases = await Purchase.find({ isDeleted: false }).populate('vendor', 'name').populate('itemCategory', 'name');
      return purchases.map((p) => ({
        Vendor: p.vendor?.name,
        Category: p.itemCategory?.name,
        Brand: p.brand,
        Quantity: p.quantity,
        Invoice: p.invoiceNo,
        Date: p.purchaseDate?.toISOString().slice(0, 10)
      }));
    }
    case 'user-inventory': {
      const items = await InventoryItem.find({ isDeleted: false, status: 'Issued', ...(query.userId ? { currentUser: query.userId } : {}) })
        .populate('itemCategory', 'name')
        .populate('currentUser', 'name');
      return items.map((i) => ({
        User: i.currentUser?.name,
        Serial: i.serialNumber,
        Category: i.itemCategory?.name,
        Brand: i.brand,
        Model: i.model
      }));
    }
    case 'tickets': {
      const tickets = await Ticket.find({ isDeleted: false }).populate('user', 'name').populate('department', 'name');
      return tickets.map((t) => ({
        TicketNumber: t.ticketNumber,
        User: t.user?.name,
        Department: t.department?.name,
        Status: t.status,
        Priority: t.priority,
        Created: t.createdAt?.toISOString().slice(0, 10)
      }));
    }
    default:
      return [];
  }
}

// GET /api/reports/:type?format=excel|csv|pdf
exports.generate = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { format = 'excel' } = req.query;
  if (!REPORT_TYPES.includes(type)) throw new ApiError(400, `Unknown report type. Use one of: ${REPORT_TYPES.join(', ')}`);

  const rows = await buildRows(type, req.query);

  if (format === 'csv') {
    const csv = stringify(rows, { header: true });
    res.header('Content-Type', 'text/csv');
    res.attachment(`${type}.csv`);
    return res.send(csv);
  }

  if (format === 'pdf') {
    res.header('Content-Type', 'application/pdf');
    res.attachment(`${type}.pdf`);
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);
    doc.fontSize(16).text(type.replace(/-/g, ' ').toUpperCase(), { align: 'center' });
    doc.moveDown();
    if (rows.length) {
      const headers = Object.keys(rows[0]);
      doc.fontSize(9).text(headers.join('   |   '));
      doc.moveDown(0.5);
      rows.forEach((row) => {
        doc.text(headers.map((h) => String(row[h] ?? '')).join('   |   '));
      });
    } else {
      doc.text('No data available for this report.');
    }
    doc.end();
    return;
  }

  // default: excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type);
  sheet.columns = Object.keys(rows[0] || { Data: '' }).map((key) => ({ header: key, key, width: 22 }));
  sheet.addRows(rows);
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`${type}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// ============================================================================
// Asset History report: the full lifecycle of ONE physical asset, from the
// moment it was added to inventory through every issue/return/repair/transfer/
// scrap event, in chronological order. Unlike the reports above (which list
// many assets), this is a search-then-drill-down report for a single item.
// ============================================================================

// GET /api/reports/asset-history/search?query=44xxx
// Finds candidate assets by serial number, asset tag, brand, or model so the admin can pick
// the right one (there may be more than one match, e.g. several LCDs from the same batch).
exports.searchAssetForHistory = asyncHandler(async (req, res) => {
  const { query = '' } = req.query;
  if (!query.trim()) return res.json({ success: true, data: [] });

  const regex = new RegExp(query.trim(), 'i');
  const items = await InventoryItem.find({
    isDeleted: false,
    $or: [{ serialNumber: regex }, { assetTag: regex }, { brand: regex }, { model: regex }]
  })
    .populate('itemCategory', 'name')
    .limit(15)
    .select('serialNumber assetTag brand model status itemCategory');

  res.json({ success: true, data: items });
});

// GET /api/reports/asset-history/:itemId?format=json|excel|csv|pdf
// format=json (default) returns the item + its full chronological history for on-screen display.
// Any other format streams a downloadable report of that same timeline.
exports.assetHistoryReport = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { format = 'json' } = req.query;

  const item = await InventoryItem.findOne({ _id: itemId, isDeleted: false })
    .populate('itemCategory', 'name')
    .populate('currentUser', 'name email')
    .populate({ path: 'purchase', populate: [{ path: 'vendor', select: 'name' }, { path: 'office', select: 'name location' }] });
  if (!item) throw new ApiError(404, 'Asset not found');

  // Chronological (oldest first) — this is a lifecycle report, so it should read top-to-bottom
  // the same way the asset's life actually happened: added -> issued -> returned -> ... -> today.
  const history = await InventoryHistory.find({ item: item._id })
    .populate('performedBy', 'name')
    .populate('targetUser', 'name')
    .populate('relatedTicket', 'ticketNumber')
    .sort({ dateTime: 1 });

  if (format === 'json') {
    return res.json({ success: true, data: { item, history } });
  }

  const rows = history.map((h) => ({
    Date: h.dateTime?.toISOString().slice(0, 19).replace('T', ' '),
    Action: h.action,
    PerformedBy: h.performedBy?.name || '',
    InvolvingUser: h.targetUser?.name || '',
    Ticket: h.relatedTicket?.ticketNumber || '',
    Notes: h.notes || ''
  }));
  const filenameBase = `asset-history-${item.serialNumber}`;

  if (format === 'csv') {
    const csv = stringify(rows, { header: true });
    res.header('Content-Type', 'text/csv');
    res.attachment(`${filenameBase}.csv`);
    return res.send(csv);
  }

  if (format === 'pdf') {
    res.header('Content-Type', 'application/pdf');
    res.attachment(`${filenameBase}.pdf`);
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);
    doc.fontSize(16).text(`Asset History — ${item.serialNumber}`, { align: 'center' });
    doc.fontSize(10).text(
      `${item.itemCategory?.name || ''}  ${item.brand || ''} ${item.model || ''}  •  Current status: ${item.status}`,
      { align: 'center' }
    );
    doc.moveDown();
    if (rows.length) {
      const headers = Object.keys(rows[0]);
      doc.fontSize(9).text(headers.join('   |   '));
      doc.moveDown(0.5);
      rows.forEach((row) => {
        doc.text(headers.map((h) => String(row[h] ?? '')).join('   |   '));
      });
    } else {
      doc.text('No history recorded for this asset yet.');
    }
    doc.end();
    return;
  }

  // default: excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Asset History');
  sheet.columns = Object.keys(rows[0] || { Date: '' }).map((key) => ({ header: key, key, width: 24 }));
  sheet.addRows(rows);
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`${filenameBase}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});
