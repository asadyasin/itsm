const mongoose = require('mongoose');

const STATUS_VALUES = ['Available', 'Issued', 'Repair', 'Lost', 'Scrapped', 'Reserved'];

const inventoryItemSchema = new mongoose.Schema(
  {
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
    itemCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', required: true },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNumber: { type: String, required: true, unique: true, trim: true, index: true },
    assetTag: { type: String, unique: true, sparse: true, trim: true }, // human readable tag, e.g. IT-000123
    qrCodeData: { type: String }, // encoded payload used to render QR (asset tag / item id)
    status: { type: String, enum: STATUS_VALUES, default: 'Available', index: true },
    currentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    currentTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    warrantyExpiry: { type: Date, default: null },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false } // soft delete only; history is permanent regardless
  },
  { timestamps: true }
);

inventoryItemSchema.index({ serialNumber: 'text', assetTag: 'text', model: 'text', brand: 'text' });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
