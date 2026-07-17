const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');

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

// Configurable templates: keep the copy here so it's easy to change without touching controller code.
const templates = {
  'item-issued': ({ userName, ticketNumber, itemCategory, brand, model, serialNumber, issueDate }) => ({
    subject: 'IT Inventory Item Issued',
    text: `Hello ${userName},

The following inventory item has been issued to you.

Ticket Number: ${ticketNumber || 'N/A'}
Item: ${itemCategory}
Brand: ${brand || '-'}
Model: ${model || '-'}
Serial Number: ${serialNumber}
Issue Date: ${issueDate}
Issued By: IT Department

Thank you.`
  }),
  'item-returned': ({ userName, itemCategory, serialNumber, returnDate }) => ({
    subject: 'IT Inventory Item Returned',
    text: `Hello ${userName},

This confirms the return of the following item.

Item: ${itemCategory}
Serial Number: ${serialNumber}
Return Date: ${returnDate}

Thank you.`
  }),
  'ticket-status': ({ userName, ticketNumber, status }) => ({
    subject: `Ticket ${ticketNumber} Update`,
    text: `Hello ${userName},

Your ticket ${ticketNumber} status has changed to: ${status}.

You can view details in the IT Help Desk portal.`
  }),
  'ticket-created': ({ recipientName, isRequester, requesterName, ticketNumber, description, ticketLink }) => ({
    subject: `New IT Support Ticket ${ticketNumber}`,
    text: `Hello ${recipientName},

${isRequester ? 'Your support ticket has been submitted successfully and is awaiting approval.' : `${requesterName} submitted a new support ticket.`}

Ticket Number: ${ticketNumber}
Description: ${description}

View the ticket here:
${ticketLink}

Thank you.`
  })
};

// Builds the link embedded in ticket emails. Clicking it opens the ticket directly in the app;
// if the recipient isn't logged in, they're sent to login first and returned here afterward.
function buildTicketLink(ticketId) {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${base}/tickets/${ticketId}`;
}

async function sendTemplateEmail({ to, template, data, relatedTicket = null, relatedItem = null, sentBy = null }) {
  const build = templates[template];
  if (!build) throw new Error(`Unknown email template: ${template}`);
  const { subject, text } = build(data);

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text
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
