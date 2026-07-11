const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ItemCategory = require('../models/ItemCategory');

exports.list = asyncHandler(async (req, res) => {
  const categories = await ItemCategory.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: categories });
});

exports.create = asyncHandler(async (req, res) => {
  const category = await ItemCategory.create(req.body);
  res.status(201).json({ success: true, data: category });
});

exports.update = asyncHandler(async (req, res) => {
  const category = await ItemCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: category });
});

exports.remove = asyncHandler(async (req, res) => {
  const category = await ItemCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, message: 'Category deactivated' });
});
