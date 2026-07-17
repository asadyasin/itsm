const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Department = require('../models/Department');

exports.list = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.office) filter.office = req.query.office;
  const departments = await Department.find(filter)
    .populate('manager', 'name email')
    .populate({ path: 'office', select: 'name location company', populate: { path: 'company', select: 'name' } })
    .sort({ name: 1 });
  res.json({ success: true, data: departments });
});

exports.create = asyncHandler(async (req, res) => {
  const dept = await Department.create(req.body);
  res.status(201).json({ success: true, data: dept });
});

exports.update = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!dept) throw new ApiError(404, 'Department not found');
  res.json({ success: true, data: dept });
});

exports.remove = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!dept) throw new ApiError(404, 'Department not found');
  res.json({ success: true, message: 'Department deactivated' });
});
