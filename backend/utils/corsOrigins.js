// CLIENT_URL supports a comma-separated list so you can allow your production domain,
// Vercel preview URLs, and localhost all at once, e.g.:
//   CLIENT_URL=https://itsm.vercel.app,https://itsm-git-staging.vercel.app,http://localhost:5173
function getAllowedOrigins() {
  return (process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

// Usable directly as the `origin` option for both the `cors` package and Socket.IO's CORS config.
function corsOriginCheck(origin, callback) {
  const allowed = getAllowedOrigins();
  // Allow non-browser requests (no Origin header, e.g. server-to-server health checks) and
  // any explicitly whitelisted origin. Reject everything else.
  if (!origin || allowed.includes(origin)) return callback(null, true);
  callback(new Error(`Origin '${origin}' is not allowed by CORS`));
}

module.exports = { getAllowedOrigins, corsOriginCheck };
