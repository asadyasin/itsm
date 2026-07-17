const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    purchaseDate: { type: Date, required: true, default: Date.now },
    itemCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', required: true },
    office: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true }, // which office this stock belongs to / is stored at
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    invoiceNo: { type: String, trim: true },
    unitPrice: { type: Number, default: 0 },
    warrantyMonths: { type: Number, default: 0 },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
