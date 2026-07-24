// Simple organization identity used when generating QR codes / printable asset labels,
// and now also for branding the HTML emails sent to employees.
module.exports = {
  orgName: process.env.ORG_NAME || "Company IT Department",
  defaultLocation: process.env.ORG_DEFAULT_LOCATION || "Head Office",
  // Shown in the header of HTML emails. Defaults to the frontend's own /logo.png, which only
  // resolves once the frontend is actually deployed somewhere public - set ORG_LOGO_URL
  // explicitly if that's not reachable (e.g. still on localhost) or you want a different image.
  logoUrl:
    process.env.ORG_LOGO_URL ||
    (process.env.CLIENT_URL
      ? `${process.env.CLIENT_URL.split(",")[0]}/logo.png`
      : ""),
  helpdeskEmail: process.env.ORG_HELPDESK_EMAIL || process.env.SMTP_USER || "",
  policyUrl: process.env.ORG_IT_POLICY_URL || "",
};
