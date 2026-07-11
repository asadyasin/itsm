const InventoryHistory = require('../models/InventoryHistory');

// Every state change to a physical asset MUST go through this function so that
// the timeline shown on the asset detail page is always complete and immutable.
async function recordHistory({ item, action, performedBy, targetUser = null, relatedTicket = null, notes = '' }) {
  return InventoryHistory.create({ item, action, performedBy, targetUser, relatedTicket, notes });
}

module.exports = { recordHistory };
