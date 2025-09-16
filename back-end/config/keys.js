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
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '150.230.85.70',
  user: process.env.DB_USER || 'react',
  password: process.env.DB_PASSWORD || 'react',
  database: process.env.DB_NAME || 'react',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT) || 10,
  queueLimit: 0,
};

const mysqlPool = mysql.createPool(dbConfig);

module.exports = {
  dbConfig,
  mysqlPool,
  secret: process.env.JWT_SECRET || 'yourSecretKey',
};
