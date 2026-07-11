const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Vendor = require('../models/Vendor');

exports.list = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  const filter = { isActive: true };
  if (search) filter.$text = { $search: search };
  const vendors = await Vendor.find(filter).sort({ name: 1 });
  res.json({ success: true, data: vendors });
});

exports.create = asyncHandler(async (req, res) => {
  const vendor = await Vendor.create(req.body);
  res.status(201).json({ success: true, data: vendor });
});

exports.update = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  res.json({ success: true, data: vendor });
});

exports.remove = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  res.json({ success: true, message: 'Vendor deactivated' });
});
