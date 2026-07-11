const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, sparse: true, trim: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
