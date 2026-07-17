const mongoose = require('mongoose');

// e.g. "Lahore Office" or "Paris Office" under a Company.
// The `location` string here is what inventory items automatically inherit —
// nobody types a location by hand when registering serial numbers.
const officeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Lahore Office"
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    location: { type: String, required: true, trim: true }, // e.g. "Lahore, Pakistan" or a full address
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

officeSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Office', officeSchema);
