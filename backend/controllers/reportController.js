const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const InventoryItem = require('../models/InventoryItem');
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
      const InventoryHistory = require('../models/InventoryHistory');
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
