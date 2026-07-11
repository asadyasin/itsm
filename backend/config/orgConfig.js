// Simple organization identity used when generating QR codes / printable asset labels.
// Pull from env so different deployments (or future multi-branch setups) can override without code changes.
module.exports = {
  orgName: process.env.ORG_NAME || 'Company IT Department',
  defaultLocation: process.env.ORG_DEFAULT_LOCATION || 'Head Office'
};
