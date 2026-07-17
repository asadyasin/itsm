const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true, sparse: true, trim: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    office: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// A department name only needs to be unique within its office (e.g. "IT" can exist at both offices).
departmentSchema.index({ office: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
