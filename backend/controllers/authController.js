const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/tokens');
const { logAction } = require('../services/auditService');

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

async function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  return accessToken;
}

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, isDeleted: false }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been disabled. Contact your administrator.');
  }

  const accessToken = await issueTokens(res, user);
  await logAction({ actor: user._id, action: 'LOGIN', module: 'Auth', ip: req.ip });

  res.json({ success: true, data: { accessToken, user: user.toSafeObject() } });
});

// POST /api/auth/refresh
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token provided');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    throw new ApiError(401, 'Refresh token expired or invalid');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
    throw new ApiError(401, 'Refresh token no longer valid. Please log in again.');
  }

  const accessToken = await issueTokens(res, user); // rotate refresh token
  res.json({ success: true, data: { accessToken, user: user.toSafeObject() } });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
    } catch (err) {
      // token already invalid, nothing to clean up
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeObject() });
});

// PATCH /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  await logAction({ actor: user._id, action: 'CHANGE_PASSWORD', module: 'Auth' });
  res.json({ success: true, message: 'Password updated successfully' });
});
