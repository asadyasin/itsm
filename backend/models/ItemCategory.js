const mongoose = require('mongoose');

const itemCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // e.g. Laptop, Mouse, Keyboard
    description: { type: String, trim: true },
    lowStockThreshold: { type: Number, default: 5 }, // triggers low-stock alert on dashboard
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ItemCategory', itemCategorySchema);
