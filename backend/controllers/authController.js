const { OAuth2Client } = require('google-auth-library');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/tokens');
const { logAction } = require('../services/auditService');

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    // In production the frontend (Vercel) and backend (Render) are on different domains,
    // which browsers treat as "cross-site". SameSite=None is required for the cookie to be
    // sent at all in that case, and SameSite=None is only honored by browsers when Secure
    // is also set (i.e. served over HTTPS, which both Vercel and Render do by default).
    // In local dev, localhost:5173 <-> localhost:5000 is same-site (port is ignored), so
    // 'lax' works fine there and doesn't require HTTPS.
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
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

// POST /api/auth/google
// Sign in (or self-register) with a Google Workspace account. The frontend uses Google Identity
// Services to obtain a signed ID token from Google and sends it here — it's never trusted blindly,
// it's cryptographically verified against Google's own servers before anything happens.
//
// First-time sign-in auto-creates the account with the default 'user' role and no department;
// an admin assigns the real role/department afterward from the Users page. This is the entire
// point of the feature — no manual account creation needed before someone can log in.
exports.googleLogin = asyncHandler(async (req, res) => {
  if (!googleClient) {
    throw new ApiError(500, 'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID.');
  }

  const { credential } = req.body;
  if (!credential) throw new ApiError(400, 'Missing Google credential');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired Google sign-in token');
  }

  if (!payload?.email_verified) {
    throw new ApiError(403, 'Your Google email is not verified');
  }

  // Optional: restrict sign-in to a specific Google Workspace domain (your company's domain),
  // rather than allowing any Gmail account. Set GOOGLE_WORKSPACE_DOMAIN to enforce this.
  const requiredDomain = process.env.GOOGLE_WORKSPACE_DOMAIN;
  if (requiredDomain && payload.hd !== requiredDomain) {
    throw new ApiError(403, `Only ${requiredDomain} Google Workspace accounts can sign in here`);
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ googleId: payload.sub, isDeleted: false });

  if (!user) {
    // Not linked by Google ID yet — check if an account with this email already exists
    // (e.g. an admin pre-created it, or they'd previously signed in with a password) and link it.
    user = await User.findOne({ email, isDeleted: false });
    if (user) {
      user.googleId = payload.sub;
      if (!user.avatarUrl) user.avatarUrl = payload.picture;
      await user.save();
    }
  }

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    user = await User.create({
      name: payload.name || email,
      email,
      authProvider: 'google',
      googleId: payload.sub,
      avatarUrl: payload.picture,
      role: 'user' // default role — an admin assigns the real one afterward
    });
  }

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been disabled. Contact your administrator.');
  }

  const accessToken = await issueTokens(res, user);
  await logAction({
    actor: user._id,
    action: isNewUser ? 'GOOGLE_SIGNUP' : 'GOOGLE_LOGIN',
    module: 'Auth',
    ip: req.ip,
    description: isNewUser ? 'First-time Google sign-in — account auto-created with default role' : undefined
  });

  res.json({ success: true, data: { accessToken, user: user.toSafeObject(), isNewUser } });
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
  res.clearCookie('refreshToken', refreshCookieOptions());
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
  if (!user.password) {
    throw new ApiError(400, 'Your account signs in with Google and has no password to change. Contact an administrator if you need one set.');
  }
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  await logAction({ actor: user._id, action: 'CHANGE_PASSWORD', module: 'Auth' });
  res.json({ success: true, message: 'Password updated successfully' });
});
