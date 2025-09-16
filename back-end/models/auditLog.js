/* eslint-disable max-len */
const {mysqlPool} = require('../config/keys');

/**
 * Create an audit log entry.
 * @param {Object} log log payload.
 * @param {number|string|null} [log.userId] user identifier.
 * @param {string} log.action action performed.
 * @param {string|null} [log.details] details or metadata.
 * @return {Promise<void>} promise.
 */
async function createLog({userId = null, action, details = null}) {
  if (!action) {
    return;
  }

  await mysqlPool.query(`
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (?, ?, ?)
  `, [userId ? Number(userId) : null, action, details]);
}

module.exports = {
  createLog,
};
