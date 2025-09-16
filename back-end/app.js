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
const express = require('express');
const passport = require('passport');
const compression = require('compression');
const http = require('http');
const cors = require('cors');
const path = require('path');
const CronJob = require('cron').CronJob;
const crons = require('./config/crons');
const {initializeDatabase} = require('./config/database');

require('dotenv').config();

// Instantiate express
const app = express();
app.use(compression());

// Passport Config
require('./config/passport')(passport);

// Initialize MySQL connection
initializeDatabase()
    .then(() => console.log('MySQL Connected'))
    .catch((err) => console.log('MySQL connection error', err));

app.use(cors());
// Express body parsing
app.use('/public', express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// REACT BUILD for production
if (process.env.NODE_ENV === 'PROD') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Initialize routes middleware
app.use('/api/users', require('./routes/users'));

// run at 3:10 AM -> delete old tokens
const tokensCleanUp = new CronJob('10 3 * * *', function() {
  crons.tokensCleanUp();
});
tokensCleanUp.start();

const PORT = process.env.PORT || 5100;


http.createServer({}, app)
    .listen(PORT, function() {
      console.log('App listening on port ' + PORT + '! Go to http://localhost:' + PORT + '/');
    });
