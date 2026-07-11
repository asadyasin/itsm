const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { logAction } = require('../services/auditService');

// GET /api/users  (admin: all, manager: own department)
exports.listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', department, role } = req.query;
  const filter = { isDeleted: false };

  if (req.user.role === 'manager') filter.department = req.user.department;
  else if (department) filter.department = department;

  if (role) filter.role = role;
  if (search) filter.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(filter).populate('department', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter)
  ]);

  res.json({ success: true, data: items.map((u) => u.toSafeObject()), meta: { total, page: Number(page), limit: Number(limit) } });
});

// GET /api/users/:id
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false }).populate('department', 'name');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: user.toSafeObject() });
});

// POST /api/users  (admin only)
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, phone, designation, manager } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'A user with this email already exists');

  const user = await User.create({ name, email, password, role, department, phone, designation, manager });
  await logAction({ actor: req.user._id, action: 'CREATE_USER', module: 'User', targetId: user._id, targetModel: 'User', description: `Created user ${email}` });

  res.status(201).json({ success: true, data: user.toSafeObject() });
});

// PATCH /api/users/:id  (admin only)
exports.updateUser = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'role', 'department', 'phone', 'designation', 'manager', 'isActive'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const user = await User.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, updates, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');

  await logAction({ actor: req.user._id, action: 'UPDATE_USER', module: 'User', targetId: user._id, targetModel: 'User' });
  res.json({ success: true, data: user.toSafeObject() });
});

// PATCH /api/users/:id/disable  (admin only) - soft disable, not delete
exports.toggleActive = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) throw new ApiError(404, 'User not found');

  user.isActive = !user.isActive;
  await user.save();
  await logAction({ actor: req.user._id, action: user.isActive ? 'ENABLE_USER' : 'DISABLE_USER', module: 'User', targetId: user._id, targetModel: 'User' });

  res.json({ success: true, data: user.toSafeObject() });
});

// POST /api/users/:id/reset-password  (admin only)
exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) throw new ApiError(404, 'User not found');

  const tempPassword = crypto.randomBytes(6).toString('hex');
  user.password = tempPassword;
  user.mustChangePassword = true;
  await user.save();

  await logAction({ actor: req.user._id, action: 'RESET_PASSWORD', module: 'User', targetId: user._id, targetModel: 'User' });

  // Returned once so the admin can relay it; never logged or stored in plaintext.
  res.json({ success: true, message: 'Password reset. Share the temporary password securely with the user.', data: { tempPassword } });
});

// DELETE /api/users/:id  (admin only, soft delete)
exports.softDeleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate({ _id: req.params.id }, { isDeleted: true, isActive: false }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  await logAction({ actor: req.user._id, action: 'DELETE_USER', module: 'User', targetId: user._id, targetModel: 'User' });
  res.json({ success: true, message: 'User deactivated' });
});
