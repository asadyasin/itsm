const fs = require('fs');
const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');

// Reads an uploaded CSV or XLSX file (from multer's req.file) into an array of plain row objects,
// keyed by the header row. Used by every bulk-import endpoint so parsing logic lives in one place.
async function parseUploadedRows(file) {
  if (!file) return [];

  if (file.mimetype === 'text/csv') {
    const content = fs.readFileSync(file.path, 'utf8');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file.path);
  const sheet = workbook.worksheets[0];
  const headers = sheet.getRow(1).values.slice(1).map((h) => String(h ?? '').trim());
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values.slice(1);
    const record = {};
    headers.forEach((h, i) => (record[h] = values[i] !== undefined && values[i] !== null ? String(values[i]).trim() : ''));
    rows.push(record);
  });
  return rows;
}

function cleanupFile(file) {
  if (file?.path) fs.unlink(file.path, () => {});
}

module.exports = { parseUploadedRows, cleanupFile };
