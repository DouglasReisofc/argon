/* eslint-disable max-len */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {mysqlPool} = require('../config/keys');

const PURPOSES = {
  EMAIL_CONFIRMATION: 'email_confirmation',
  PASSWORD_RESET: 'password_reset',
};

/**
 * Generate a numeric verification code of the provided length.
 * @param {number} length desired code length.
 * @return {string} generated code.
 */
function generateNumericCode(length = 6) {
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  const randomNumber = crypto.randomInt(min, max + 1);
  return String(randomNumber);
}

/**
 * Mark existing codes for a user and purpose as consumed.
 * @param {number|string} userId identifier of the user.
 * @param {string} purpose verification purpose.
 * @return {Promise<void>} promise.
 */
async function invalidateExistingCodes(userId, purpose) {
  await mysqlPool.query(`
    UPDATE user_verification_codes
    SET consumed_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL
  `, [Number(userId), purpose]);
}

/**
 * Create and store a verification code for a user.
 * @param {number|string} userId identifier of the user.
 * @param {string} purpose purpose of the code.
 * @param {number} ttlMinutes time to live in minutes.
 * @param {number} length desired code length.
 * @return {Promise<{code: string, expiresAt: Date}>} generated code metadata.
 */
async function createCode(userId, purpose, ttlMinutes = 30, length = 6) {
  const normalizedPurpose = purpose === PURPOSES.PASSWORD_RESET ? PURPOSES.PASSWORD_RESET : PURPOSES.EMAIL_CONFIRMATION;
  const code = generateNumericCode(length);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const hash = await bcrypt.hash(code, 10);

  await invalidateExistingCodes(userId, normalizedPurpose);
  await mysqlPool.query(`
    INSERT INTO user_verification_codes (user_id, purpose, code_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `, [Number(userId), normalizedPurpose, hash, expiresAt]);

  return {code, expiresAt};
}

/**
 * Consume a verification code if it is valid and not expired.
 * @param {number|string} userId identifier of the user.
 * @param {string} purpose verification purpose.
 * @param {string} code code supplied by the user.
 * @return {Promise<boolean>} flag indicating whether the code was valid.
 */
async function consumeCode(userId, purpose, code) {
  const normalizedPurpose = purpose === PURPOSES.PASSWORD_RESET ? PURPOSES.PASSWORD_RESET : PURPOSES.EMAIL_CONFIRMATION;
  const [rows] = await mysqlPool.query(`
    SELECT id, code_hash, expires_at
    FROM user_verification_codes
    WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL
    ORDER BY created_at DESC
  `, [Number(userId), normalizedPurpose]);

  for (const row of rows) {
    if (new Date(row.expires_at) < new Date()) {
      await mysqlPool.query(`
        UPDATE user_verification_codes
        SET consumed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [row.id]);
      continue;
    }

    const isMatch = await bcrypt.compare(code, row.code_hash).catch(() => false);
    if (isMatch) {
      await mysqlPool.query(`
        UPDATE user_verification_codes
        SET consumed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [row.id]);
      return true;
    }
  }

  return false;
}

/**
 * Check whether a user has an active code for a given purpose.
 * @param {number|string} userId identifier of the user.
 * @param {string} purpose verification purpose.
 * @return {Promise<boolean>} flag indicating presence of active code.
 */
async function hasActiveCode(userId, purpose) {
  const normalizedPurpose = purpose === PURPOSES.PASSWORD_RESET ? PURPOSES.PASSWORD_RESET : PURPOSES.EMAIL_CONFIRMATION;
  const [rows] = await mysqlPool.query(`
    SELECT 1
    FROM user_verification_codes
    WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL AND expires_at >= CURRENT_TIMESTAMP
    LIMIT 1
  `, [Number(userId), normalizedPurpose]);
  return rows.length > 0;
}

/**
 * Permanently remove expired verification codes.
 * @return {Promise<void>} promise.
 */
async function deleteExpired() {
  await mysqlPool.query(`
    DELETE FROM user_verification_codes
    WHERE expires_at < CURRENT_TIMESTAMP
  `);
}

module.exports = {
  PURPOSES,
  createCode,
  consumeCode,
  hasActiveCode,
  deleteExpired,
};
