/* eslint-disable max-len */
/* !

=========================================================
* Argon React NodeJS - v1.0.0
=========================================================

* Product Page: https://argon-dashboard-react-nodejs.creative-tim.com/
* Copyright 2020 Creative Tim (https://https://www.creative-tim.com//)
* Copyright 2020 ProjectData (https://projectdata.dev/)
* Licensed under MIT (https://github.com/creativetimofficial/argon-dashboard-react-nodejs/blob/main/README.md)

* Coded by Creative Tim & ProjectData

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
const {mysqlPool} = require('../config/keys');

/**
 * Map database row to active session object.
 * @param {Object} row database row.
 * @return {Object|null} mapped session.
 */
function mapSessionRow(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id != null ? String(row.id) : null,
    token: row.token,
    userId: row.user_id != null ? String(row.user_id) : null,
    ipAddress: row.ip_address || null,
    userAgent: row.user_agent || null,
    date: row.created_at,
    lastSeen: row.last_seen,
  };
}

/**
 * Find session by token.
 * @param {string} token session token.
 * @return {Promise<Object|null>} promise resolving to the session.
 */
async function findByToken(token) {
  const [rows] = await mysqlPool.query(`
    SELECT id, token, user_id, ip_address, user_agent, created_at, last_seen
    FROM active_sessions
    WHERE token = ?
    LIMIT 1
  `, [token]);
  return mapSessionRow(rows[0]);
}

/**
 * Create a new session.
 * @param {Object} session session data.
 * @return {Promise<Object>} promise resolving to created session.
 */
async function create(session) {
  const now = new Date();
  const [result] = await mysqlPool.query(`
    INSERT INTO active_sessions (token, user_id, ip_address, user_agent, created_at, last_seen)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    session.token,
    Number(session.userId),
    session.ipAddress || null,
    session.userAgent || null,
    now,
    now,
  ]);
  return {
    _id: result.insertId != null ? String(result.insertId) : null,
    token: session.token,
    userId: String(session.userId),
    ipAddress: session.ipAddress || null,
    userAgent: session.userAgent || null,
    date: now,
    lastSeen: now,
  };
}

/**
 * Delete session by token.
 * @param {string} token session token.
 * @return {Promise<void>} promise.
 */
async function deleteByToken(token) {
  await mysqlPool.query(`
    DELETE FROM active_sessions
    WHERE token = ?
  `, [token]);
}

/**
 * Update last seen timestamp for session.
 * @param {string} token session token.
 * @return {Promise<void>} promise.
 */
async function touch(token) {
  await mysqlPool.query(`
    UPDATE active_sessions
    SET last_seen = CURRENT_TIMESTAMP
    WHERE token = ?
  `, [token]);
}

/**
 * Delete sessions older than provided date.
 * @param {Date} date cutoff date.
 * @return {Promise<void>} promise.
 */
async function deleteOlderThan(date) {
  await mysqlPool.query(`
    DELETE FROM active_sessions
    WHERE created_at < ?
  `, [date]);
}

module.exports = {
  findByToken,
  create,
  deleteByToken,
  deleteOlderThan,
  touch,
};
