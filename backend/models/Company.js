const mongoose = require('mongoose');

// Top of the org hierarchy: Company -> Office -> Department -> User.
// Most deployments will only ever have one Company document, but this keeps the
// door open for genuine multi-company support later without a schema change.
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
