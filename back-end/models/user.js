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
    accountConfirmation: Boolean(row.account_confirmation),
    resetPass: Boolean(row.reset_pass),
    date: row.created_at,
  };
}

/**
 * Retrieve all users.
 * @return {Promise<Array>} promise resolving to list of users.
 */
async function findAll() {
  const [rows] = await mysqlPool.query(`
    SELECT id, name, email, password, account_confirmation, reset_pass, created_at
    FROM users
  `);
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

  const [rows] = await mysqlPool.query(`
    SELECT id, name, email, password, account_confirmation, reset_pass, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [numericId]);
  return mapUserRow(rows[0]);
}

/**
 * Retrieve a user by email.
 * @param {string} email email address.
 * @return {Promise<Object|null>} promise resolving to user or null.
 */
async function findByEmail(email) {
  const [rows] = await mysqlPool.query(`
    SELECT id, name, email, password, account_confirmation, reset_pass, created_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `, [email]);
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
    INSERT INTO users (name, email, password, account_confirmation, reset_pass, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    user.name,
    user.email,
    user.password,
    user.accountConfirmation ? 1 : 0,
    user.resetPass ? 1 : 0,
    now,
  ]);

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
  if (Object.prototype.hasOwnProperty.call(fields, 'accountConfirmation')) {
    updates.push('account_confirmation = ?');
    values.push(fields.accountConfirmation ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'resetPass')) {
    updates.push('reset_pass = ?');
    values.push(fields.resetPass ? 1 : 0);
  }

  if (!updates.length) {
    return findById(numericId);
  }

  values.push(numericId);
  await mysqlPool.query(`
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = ?
  `, values);

  return findById(numericId);
}

/**
 * Delete all users except the provided email.
 * @param {string} email email to keep.
 * @return {Promise<void>} promise.
 */
async function deleteAllExceptEmail(email) {
  await mysqlPool.query(`
    DELETE FROM users
    WHERE email <> ?
  `, [email]);
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  create,
  updateById,
  deleteAllExceptEmail,
};
