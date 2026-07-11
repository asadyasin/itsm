const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authenticated. Please log in.');
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Session expired or invalid token.');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.isDeleted || !user.isActive) {
    throw new ApiError(401, 'Account not found or disabled.');
  }

  req.user = user; // full mongoose doc, minus password (not selected by default)
  next();
});

module.exports = protect;
