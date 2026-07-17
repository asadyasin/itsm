const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Company = require('../models/Company');

exports.list = asyncHandler(async (req, res) => {
  const companies = await Company.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: companies });
});

exports.create = asyncHandler(async (req, res) => {
  const company = await Company.create(req.body);
  res.status(201).json({ success: true, data: company });
});

exports.update = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!company) throw new ApiError(404, 'Company not found');
  res.json({ success: true, data: company });
});

exports.remove = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!company) throw new ApiError(404, 'Company not found');
  res.json({ success: true, message: 'Company deactivated' });
});
