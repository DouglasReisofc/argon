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

const BASE_SELECT = `
    SELECT u.id, u.name, u.email, u.password, u.role, u.is_active, u.account_confirmation,
           u.reset_pass, u.last_login, u.created_at, u.updated_at,
           p.phone AS profile_phone, p.agency AS profile_agency
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
  `;

/**
 * Map database row to user object compatible with the previous Mongo schema.
 * @param {Object} row database row.
 * @return {Object|null} mapped user.
 */
function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id != null ? String(row.id) : null,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    isActive: Boolean(row.is_active),
    accountConfirmation: Boolean(row.account_confirmation),
    resetPass: Boolean(row.reset_pass),
    lastLogin: row.last_login,
    date: row.created_at,
    updatedAt: row.updated_at,
    profile: {
      phone: row.profile_phone || null,
      agency: row.profile_agency || null,
    },
  };
}

/**
 * Insert or update additional profile information for a user.
 * @param {number|string} userId identifier of the user.
 * @param {Object} profile profile details payload.
 * @return {Promise<void>} promise.
 */
async function upsertProfile(userId, profile) {
  if (!profile) {
    return;
  }

  const phone = Object.prototype.hasOwnProperty.call(profile, 'phone') ? profile.phone : null;
  const agency = Object.prototype.hasOwnProperty.call(profile, 'agency') ? profile.agency : null;

  await mysqlPool.query(`
    INSERT INTO user_profiles (user_id, phone, agency)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      phone = VALUES(phone),
      agency = VALUES(agency),
      updated_at = CURRENT_TIMESTAMP
  `, [Number(userId), phone, agency]);
}

/**
 * Retrieve all users.
 * @return {Promise<Array>} promise resolving to list of users.
 */
async function findAll() {
  const [rows] = await mysqlPool.query(`${BASE_SELECT}`);
  return rows.map(mapUserRow);
}

/**
 * Retrieve a user by id.
 * @param {number|string} id user id.
 * @return {Promise<Object|null>} promise resolving to user or null.
 */
async function findById(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return null;
  }

  const [rows] = await mysqlPool.query(`${BASE_SELECT} WHERE u.id = ? LIMIT 1`, [numericId]);
  return mapUserRow(rows[0]);
}

/**
 * Retrieve a user by email.
 * @param {string} email email address.
 * @return {Promise<Object|null>} promise resolving to user or null.
 */
async function findByEmail(email) {
  const [rows] = await mysqlPool.query(`${BASE_SELECT} WHERE u.email = ? LIMIT 1`, [email]);
  return mapUserRow(rows[0]);
}

/**
 * Create a new user.
 * @param {Object} user user fields.
 * @return {Promise<Object>} promise resolving to created user.
 */
async function create(user) {
  const now = new Date();
  const [result] = await mysqlPool.query(`
    INSERT INTO users (name, email, password, role, is_active, account_confirmation, reset_pass, last_login, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    user.name,
    user.email,
    user.password,
    user.role === 'admin' ? 'admin' : 'user',
    user.isActive ? 1 : 0,
    user.accountConfirmation ? 1 : 0,
    user.resetPass ? 1 : 0,
    user.lastLogin || null,
    now,
    now,
  ]);

  if (user.profile) {
    await upsertProfile(result.insertId, user.profile);
  }

  return findById(result.insertId);
}

/**
 * Update user by id.
 * @param {number|string} id user id.
 * @param {Object} fields fields to update.
 * @return {Promise<Object|null>} promise resolving to updated user or null.
 */
async function updateById(id, fields) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return null;
  }

  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(fields, 'name')) {
    updates.push('name = ?');
    values.push(fields.name);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'email')) {
    updates.push('email = ?');
    values.push(fields.email);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'password')) {
    updates.push('password = ?');
    values.push(fields.password);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'role')) {
    updates.push('role = ?');
    values.push(fields.role === 'admin' ? 'admin' : 'user');
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'isActive')) {
    updates.push('is_active = ?');
    values.push(fields.isActive ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'accountConfirmation')) {
    updates.push('account_confirmation = ?');
    values.push(fields.accountConfirmation ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'resetPass')) {
    updates.push('reset_pass = ?');
    values.push(fields.resetPass ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'lastLogin')) {
    updates.push('last_login = ?');
    values.push(fields.lastLogin);
  }

  if (updates.length) {
    values.push(numericId);
    await mysqlPool.query(`
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);
  }

  if (fields.profile) {
    await upsertProfile(numericId, fields.profile);
  }

  return findById(numericId);
}

/**
 * Mark account confirmation and activation for user.
 * @param {number|string} id user id.
 * @return {Promise<void>} promise.
 */
async function markAccountConfirmed(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return;
  }
  await mysqlPool.query(`
    UPDATE users
    SET account_confirmation = 1, is_active = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [numericId]);
}

/**
 * Update last login timestamp for user.
 * @param {number|string} id user id.
 * @param {Date} date login date.
 * @return {Promise<void>} promise.
 */
async function setLastLogin(id, date = new Date()) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return;
  }
  await mysqlPool.query(`
    UPDATE users
    SET last_login = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [date, numericId]);
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  create,
  updateById,
  markAccountConfirmed,
  setLastLogin,
};
