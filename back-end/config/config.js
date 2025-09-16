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
const smtpUser = process.env.SMTP_USER || 'contactgestorvip@gmail.com';
const smtpPass = process.env.SMTP_PASS || 'jwzkeloezpvrggfn';
const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:3000';

module.exports = {
  smtpConf: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  },
  webURL: process.env.WEB_URL || 'http://localhost:5100/',
  clientAppUrl,
  adminCredentials: {
    email: process.env.ADMIN_EMAIL || 'contactgestorvip@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'Dev7766@#$%',
  },
};
