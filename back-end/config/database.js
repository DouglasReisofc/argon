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
const bcrypt = require('bcryptjs');
const {mysqlPool} = require('./keys');
const {adminCredentials} = require('./config');

const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';

async function createCoreTables(connection) {
  await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        account_confirmation TINYINT(1) NOT NULL DEFAULT 0,
        reset_pass TINYINT(1) NOT NULL DEFAULT 0,
        last_login DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

  await connection.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INT PRIMARY KEY,
        phone VARCHAR(32) DEFAULT NULL,
        agency VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

  await connection.query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(512) NOT NULL,
        user_id INT NOT NULL,
        ip_address VARCHAR(64) DEFAULT NULL,
        user_agent VARCHAR(512) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_active_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

  await connection.query(`
      CREATE TABLE IF NOT EXISTS user_verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        purpose ENUM('email_confirmation', 'password_reset') NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        consumed_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_verification_user_purpose (user_id, purpose),
        CONSTRAINT fk_verification_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

  await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        action VARCHAR(128) NOT NULL,
        details TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_logs_user (user_id),
        CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

async function seedDefaultAdmin(connection) {
  const adminEmail = adminCredentials.email;
  const adminPassword = adminCredentials.password;

  if (!adminEmail || !adminPassword) {
    return;
  }

  const [existing] = await connection.query(`
      SELECT id, password, role, is_active, account_confirmation, name
      FROM users
      WHERE email = ?
      LIMIT 1
    `, [adminEmail]);

  if (!existing.length) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const now = new Date();
    await connection.query(`
        INSERT INTO users (name, email, password, role, is_active, account_confirmation, reset_pass, last_login, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', 1, 1, 0, ?, ?, ?)
      `, [
      DEFAULT_ADMIN_NAME,
      adminEmail,
      hashedPassword,
      now,
      now,
      now,
    ]);
    return;
  }

  const adminRow = existing[0];
  const updates = [];
  const params = [];

  if (adminRow.role !== 'admin') {
    updates.push('role = ?');
    params.push('admin');
  }
  if (!adminRow.is_active) {
    updates.push('is_active = 1');
  }
  if (!adminRow.account_confirmation) {
    updates.push('account_confirmation = 1');
  }
  if (!adminRow.name) {
    updates.push('name = ?');
    params.push(DEFAULT_ADMIN_NAME);
  }

  const passwordMatches = await bcrypt.compare(adminPassword, adminRow.password)
      .catch(() => false);

  if (!passwordMatches) {
    updates.push('password = ?');
    params.push(await bcrypt.hash(adminPassword, 12));
  }

  if (!updates.length) {
    return;
  }

  params.push(adminEmail);
  await connection.query(`
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `, params);
}

/**
 * Initialize database by ensuring required tables exist.
 * @return {Promise<void>} promise.
 */
async function initializeDatabase() {
  const connection = await mysqlPool.getConnection();
  try {
    await createCoreTables(connection);
    await seedDefaultAdmin(connection);
  } finally {
    connection.release();
  }
}

module.exports = {
  initializeDatabase,
};
