const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

async function logAction({ actor, action, module, targetId = null, targetModel = null, description = '', ip = '', metadata = {} }) {
  try {
    await AuditLog.create({ actor, action, module, targetId, targetModel, description, ip, metadata });
  } catch (err) {
    // Audit logging must never break the primary request flow.
    logger.error(`Audit log failure: ${err.message}`);
  }
}

module.exports = { logAction };
