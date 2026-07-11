const ApiError = require('../utils/ApiError');

/**
 * Usage: router.post('/', protect, authorize('admin'), handler)
 * authorize('admin', 'manager') allows either role through.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated.'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Role '${req.user.role}' is not permitted to perform this action.`));
    }
    next();
  };
}

module.exports = authorize;
