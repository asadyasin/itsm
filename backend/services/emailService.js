const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');
const orgConfig = require('../config/orgConfig');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

// Escapes user-supplied text (names, descriptions, notes) before it's dropped into HTML, so a
// ticket description containing "<" or "&" can't break the email's markup.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Shared visual building blocks, styled to match the company's equipment-issued
// email format: a red section heading, green bold field labels, a numbered
// "Important Information" block, and a simple logo header.
// ---------------------------------------------------------------------------

const COLORS = {
  heading: '#C0392B',
  label: '#1F8A70',
  text: '#1F2430',
  muted: '#6B7385',
  link: '#1A56DB'
};

function sectionHeading(text) {
  return `<p style="color:${COLORS.heading};font-weight:bold;font-size:14px;margin:22px 0 10px 0;">${escapeHtml(text)}</p>`;
}

function detailRow(label, value) {
  if (!value) return '';
  return `<p style="margin:5px 0 5px 16px;font-size:14px;color:${COLORS.text};">
    <span style="color:${COLORS.label};font-weight:bold;">${escapeHtml(label)}:</span> ${value}
  </p>`;
}

function numberedItem(n, lead, rest) {
  return `<p style="margin:6px 0 6px 16px;font-size:14px;color:${COLORS.text};line-height:1.6;">
    ${n}. <span style="font-weight:bold;">${escapeHtml(lead)}:</span> ${rest}
  </p>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
    <tr><td style="border-radius:6px;background-color:#2B3A67;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:10px 22px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

// Wraps a template's body content in the full HTML document: logo header, white card, footer.
function emailLayout(bodyHtml) {
  const logoBlock = orgConfig.logoUrl
    ? `<img src="${orgConfig.logoUrl}" alt="${escapeHtml(orgConfig.orgName)}" height="44" style="display:block;border:0;" />`
    : `<div style="font-size:22px;font-weight:bold;color:#2B3A67;">${escapeHtml(orgConfig.orgName)}</div>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#F4F6F9;font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F9;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #E5E9F0;">
            <tr>
              <td align="center" style="padding:30px 32px 18px 32px;border-bottom:1px solid #F0F2F6;">
                ${logoBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 8px 32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background-color:#F8F9FB;border-top:1px solid #E5E9F0;color:${COLORS.muted};font-size:12px;line-height:1.5;">
                This is an automated message from the ${escapeHtml(orgConfig.orgName)} IT Help Desk. Please do not reply directly to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function closingHtml() {
  return `<p style="margin-top:22px;font-size:14px;color:${COLORS.text};">
    If you have any further questions or concerns, please do not hesitate to contact the IT department. Thank you for your cooperation.
  </p>
  <p style="margin-top:18px;font-size:14px;color:${COLORS.text};">
    Best regards,<br /><strong>IT Support Team</strong>
  </p>`;
}

// Configurable templates: keep the copy here so it's easy to change without touching controller code.
// Each returns { subject, text, html } - text is the plain-text fallback for clients that don't render HTML.
const templates = {
  'item-issued': ({ userName, ticketNumber, itemCategory, brand, model, serialNumber, issueDate, issuedByName }) => {
    const specs = [brand, model].filter(Boolean).join(' ') || '-';
    const noteText = ticketNumber
      ? `${escapeHtml(itemCategory)} is issued to ${escapeHtml(userName)} against ticket ${escapeHtml(ticketNumber)}${issuedByName ? ` by ${escapeHtml(issuedByName)}` : ''}.`
      : `${escapeHtml(itemCategory)} is issued to ${escapeHtml(userName)}${issuedByName ? ` by ${escapeHtml(issuedByName)}` : ''}.`;

    const html = emailLayout(`
      <p style="font-size:14px;color:${COLORS.text};">Dear ${escapeHtml(userName)},</p>
      <p style="font-size:14px;color:${COLORS.text};line-height:1.6;">
        We are pleased to inform you that the requested IT equipment has been successfully processed
        and is now ready for issuance. Below, you will find the details of the equipment along with
        important information regarding its usage and support.
      </p>

      ${sectionHeading('Equipment Details:')}
      ${detailRow('Device Type', escapeHtml(itemCategory))}
      ${detailRow('Specifications', escapeHtml(specs))}
      ${detailRow('Serial Number', escapeHtml(serialNumber))}
      ${detailRow('Issue Date', escapeHtml(issueDate))}
      ${detailRow('Note', noteText)}

      ${sectionHeading('Important Information:')}
      ${numberedItem(1, 'Usage Guidelines', orgConfig.policyUrl
        ? `Please adhere to the <a href="${orgConfig.policyUrl}" style="color:${COLORS.link};">company's IT usage policy</a>.`
        : `Please adhere to the company's IT usage policy.`)}
      ${numberedItem(2, 'Security', 'Ensure that you keep your login credentials confidential. In case of any security concerns, please contact the IT department immediately.')}
      ${numberedItem(3, 'Support', `For technical assistance, software installations, or any other IT-related issues, please reach out to our IT helpdesk${orgConfig.helpdeskEmail ? ` at <a href="mailto:${orgConfig.helpdeskEmail}" style="color:${COLORS.link};">${orgConfig.helpdeskEmail}</a>` : ''}.`)}

      ${closingHtml()}
    `);

    const text = `Dear ${userName},

We are pleased to inform you that the requested IT equipment has been successfully processed and is now ready for issuance. Below, you will find the details of the equipment along with important information regarding its usage and support.

Equipment Details:
Device Type: ${itemCategory}
Specifications: ${specs}
Serial Number: ${serialNumber}
Issue Date: ${issueDate}
Note: ${itemCategory} is issued to ${userName}${issuedByName ? ` by ${issuedByName}` : ''}${ticketNumber ? ` (Ticket ${ticketNumber})` : ''}.

Important Information:
1. Usage Guidelines: Please adhere to the company's IT usage policy.
2. Security: Ensure that you keep your login credentials confidential. In case of any security concerns, please contact the IT department immediately.
3. Support: For technical assistance, software installations, or any other IT-related issues, please reach out to our IT helpdesk${orgConfig.helpdeskEmail ? ` at ${orgConfig.helpdeskEmail}` : ''}.

If you have any further questions or concerns, please do not hesitate to contact the IT department. Thank you for your cooperation.

Best regards,
IT Support Team`;

    return { subject: `IT Equipment Issued — ${serialNumber}`, text, html };
  },

  'item-returned': ({ userName, itemCategory, serialNumber, returnDate }) => {
    const html = emailLayout(`
      <p style="font-size:14px;color:${COLORS.text};">Dear ${escapeHtml(userName)},</p>
      <p style="font-size:14px;color:${COLORS.text};line-height:1.6;">
        This email confirms that the equipment listed below has been returned and checked back into
        inventory. Thank you for returning it promptly.
      </p>

      ${sectionHeading('Equipment Details:')}
      ${detailRow('Device Type', escapeHtml(itemCategory))}
      ${detailRow('Serial Number', escapeHtml(serialNumber))}
      ${detailRow('Return Date', escapeHtml(returnDate))}

      ${closingHtml()}
    `);

    const text = `Dear ${userName},

This confirms the return of the following item.

Item: ${itemCategory}
Serial Number: ${serialNumber}
Return Date: ${returnDate}

Best regards,
IT Support Team`;

    return { subject: `IT Equipment Returned — ${serialNumber}`, text, html };
  },

  'ticket-status': ({ userName, ticketNumber, status }) => {
    const html = emailLayout(`
      <p style="font-size:14px;color:${COLORS.text};">Dear ${escapeHtml(userName)},</p>
      <p style="font-size:14px;color:${COLORS.text};line-height:1.6;">
        There's an update on your support ticket. Its status has changed as shown below.
      </p>

      ${sectionHeading('Ticket Details:')}
      ${detailRow('Ticket Number', escapeHtml(ticketNumber))}
      ${detailRow('New Status', escapeHtml(status))}

      ${closingHtml()}
    `);

    const text = `Dear ${userName},

Your ticket ${ticketNumber} status has changed to: ${status}.

You can view details in the IT Help Desk portal.

Best regards,
IT Support Team`;

    return { subject: `Ticket ${ticketNumber} Update`, text, html };
  },

  'ticket-created': ({ recipientName, isRequester, requesterName, ticketNumber, description, ticketLink, priority, itemCategoryName, quantity }) => {
    const introHtml = isRequester
      ? `Thank you for reaching out. Your support request has been successfully logged and is now in
         our queue for review. Below are the details of your ticket along with what happens next.`
      : `${escapeHtml(requesterName)} has submitted a new IT support ticket that requires your attention.
         Please review the details below at your earliest convenience.`;

    const introText = isRequester
      ? 'Thank you for reaching out. Your support request has been successfully logged and is now in our queue for review. Below are the details of your ticket along with what happens next.'
      : `${requesterName} has submitted a new IT support ticket that requires your attention. Please review the details below at your earliest convenience.`;

    const html = emailLayout(`
      <p style="font-size:14px;color:${COLORS.text};">Dear ${escapeHtml(recipientName)},</p>
      <p style="font-size:14px;color:${COLORS.text};line-height:1.6;">${introHtml}</p>

      ${sectionHeading('Ticket Details:')}
      ${detailRow('Ticket Number', escapeHtml(ticketNumber))}
      ${detailRow('Requested Item', `${escapeHtml(itemCategoryName)}${quantity ? ` (Qty: ${escapeHtml(quantity)})` : ''}`)}
      ${detailRow('Priority', escapeHtml(priority))}
      ${detailRow('Description', escapeHtml(description))}
      ${detailRow('Note', `Submitted by ${escapeHtml(requesterName)}.`)}

      ${sectionHeading('Important Information:')}
      ${numberedItem(1, 'Next Steps', 'Your ticket will first be reviewed by your manager, then processed by the IT department for fulfillment.')}
      ${numberedItem(2, 'Tracking', 'You can check the live status of your ticket at any time using the button below.')}
      ${numberedItem(3, 'Support', `For urgent issues or questions about this ticket, please contact our IT helpdesk${orgConfig.helpdeskEmail ? ` at <a href="mailto:${orgConfig.helpdeskEmail}" style="color:${COLORS.link};">${orgConfig.helpdeskEmail}</a>` : ''}.`)}

      ${ctaButton(ticketLink, 'View Ticket')}

      ${closingHtml()}
    `);

    const text = `Dear ${recipientName},

${introText}

Ticket Details:
Ticket Number: ${ticketNumber}
Requested Item: ${itemCategoryName}${quantity ? ` (Qty: ${quantity})` : ''}
Priority: ${priority}
Description: ${description}
Note: Submitted by ${requesterName}.

Important Information:
1. Next Steps: Your ticket will first be reviewed by your manager, then processed by the IT department for fulfillment.
2. Tracking: You can check the live status of your ticket at any time using the link below.
3. Support: For urgent issues or questions about this ticket, please contact our IT helpdesk${orgConfig.helpdeskEmail ? ` at ${orgConfig.helpdeskEmail}` : ''}.

View your ticket: ${ticketLink}

If you have any further questions or concerns, please do not hesitate to contact the IT department. Thank you for your cooperation.

Best regards,
IT Support Team`;

    return { subject: `Support Ticket ${ticketNumber} ${isRequester ? 'Created' : 'Submitted'}`, text, html };
  }
};

// Builds the link embedded in ticket emails. Clicking it opens the ticket directly in the app;
// if the recipient isn't logged in, they're sent to login first and returned here afterward.
function buildTicketLink(ticketId) {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${base.split(',')[0]}/tickets/${ticketId}`;
}

async function sendTemplateEmail({ to, template, data, relatedTicket = null, relatedItem = null, sentBy = null }) {
  const build = templates[template];
  if (!build) throw new Error(`Unknown email template: ${template}`);
  const { subject, text, html } = build(data);

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    });
    await EmailLog.create({ to, subject, template, relatedTicket, relatedItem, status: 'Sent', sentBy });
    logger.info(`Email sent to ${to} [${template}]`);
  } catch (err) {
    logger.error(`Email failed to ${to} [${template}]: ${err.message}`);
    await EmailLog.create({ to, subject, template, relatedTicket, relatedItem, status: 'Failed', error: err.message, sentBy });
    // Do not throw: email failure should never block the underlying business transaction.
  }
}

module.exports = { sendTemplateEmail, buildTicketLink };
