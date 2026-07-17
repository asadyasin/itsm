const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Office = require('../models/Office');

exports.list = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.company) filter.company = req.query.company;
  const offices = await Office.find(filter).populate('company', 'name').sort({ name: 1 });
  res.json({ success: true, data: offices });
});

exports.create = asyncHandler(async (req, res) => {
  const office = await Office.create(req.body);
  res.status(201).json({ success: true, data: office });
});

exports.update = asyncHandler(async (req, res) => {
  const office = await Office.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!office) throw new ApiError(404, 'Office not found');
  res.json({ success: true, data: office });
});

exports.remove = asyncHandler(async (req, res) => {
  const office = await Office.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!office) throw new ApiError(404, 'Office not found');
  res.json({ success: true, message: 'Office deactivated' });
});
