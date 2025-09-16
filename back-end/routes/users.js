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
// eslint-disable-next-line new-cap
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const {secret} = require('../config/keys');
const User = require('../models/user');
const ActiveSession = require('../models/activeSession');
const reqAuth = require('../config/safeRoutes').reqAuth;
const {smtpConf} = require('../config/config');

// route /admin/users/

router.post('/all', reqAuth, async function(req, res) {
  try {
    const users = await User.findAll();
    const sanitizedUsers = users.map(function(item) {
      const x = {...item};
      x.password = undefined;
      x.__v = undefined;
      return x;
    });
    res.json({success: true, users: sanitizedUsers});
  } catch (err) {
    console.log('Error fetching users', err);
    res.json({success: false});
  }
});

router.post('/edit', reqAuth, async function(req, res) {
  const {userID, name, email} = req.body;

  try {
    const user = await User.findById(userID);
    if (!user) {
      return res.json({success: false});
    }

    const updated = await User.updateById(user._id, {name: name, email: email});
    if (!updated) {
      return res.json({success: false, msg: 'There was an error. Please contract the administator'});
    }

    return res.json({success: true});
  } catch (err) {
    console.log('Error updating user', err);
    return res.json({success: false, msg: 'There was an error. Please contract the administator'});
  }
});

router.post('/check/resetpass/:id', async (req, res) => {
  const userID = req.params.id;
  try {
    const user = await User.findById(userID);
    if (user && user.resetPass === true) {
      return res.json({success: true}); // reset password was made for this user
    }
  } catch (err) {
    console.log('Error checking reset password flag', err);
  }
  return res.json({success: false});
});

router.post('/resetpass/:id', (req, res) => {
  const errors = [];
  const userID = req.params.id;

  let {password} = req.body;

  if (!password || password.length < 6) {
    errors.push({msg: 'Password must be at least 6 characters'});
  }
  if (errors.length > 0) {
    return res.json({success: false, msg: errors});
  }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      console.log('Error generating salt for password reset', err);
      return res.json({success: false, msg: 'There was an error resetting the password'});
    }
    bcrypt.hash(password, salt, null, async (err, hash) => {
      if (err) {
        console.log('Error hashing password for reset', err);
        return res.json({success: false, msg: 'There was an error resetting the password'});
      }
      try {
        password = hash;
        const updated = await User.updateById(userID, {resetPass: false, password: password});
        if (!updated) {
          return res.json({success: false, msg: 'There was an error resetting the password'});
        }
        return res.json({success: true});
      } catch (updateErr) {
        console.log('Error updating password', updateErr);
        return res.json({success: false, msg: updateErr});
      }
    });
  });
});

router.post('/forgotpassword', async (req, res) => {
  const {email} = req.body;
  const errors = [];

  if (!email) {
    errors.push({msg: 'Please enter all fields'});
  }
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      errors.push({msg: 'Email Address does not exist'});
    }
    if (errors.length > 0) {
      return res.json({success: false, errors: errors});
    }

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport(smtpConf);

    await User.updateById(user._id, {resetPass: true});

    // don't send emails if it is in demo mode
    if (process.env.DEMO != 'yes') {
      try {
        // send mail with defined transport object
        await transporter.sendMail({
          from: '"Creative Tim" <' + smtpConf.auth.user + '>', // sender address
          to: email, // list of receivers
          subject: 'Creative Tim Reset Password', // Subject line
          // eslint-disable-next-line max-len
          html: '<h1>Hey,</h1><br><p>If you want to reset your password, please click on the following link:</p><p><a href="' + 'http://localhost:3000/auth/confirm-password/' + user._id + '">"' + 'http://localhost:3000/auth/confirm-password/' + user._id + '"</a><br><br>If you did not ask for it, please let us know immediately at <a href="mailto:' + smtpConf.auth.user + '">' + smtpConf.auth.user + '</a></p>', // html body
        });
      } catch (mailErr) {
        console.log('Error sending forgot password email', mailErr);
      }
    }
    return res.json({success: true, userID: user._id});
  } catch (err) {
    console.log('Error processing forgot password', err);
    return res.json({success: false, errors: [{msg: 'There was an error processing the request'}]});
  }
});

router.post('/register', (req, res) => {
  const {name, email, password} = req.body;

  const respondWithError = function(message) {
    return res.json({success: false, msg: message});
  };

  if (!name || !email || !password) {
    return respondWithError('Please enter all fields');
  }

  if (password.length < 6) {
    return respondWithError('Password must be at least 6 characters long');
  }

  User.findByEmail(email).then((existingUser) => {
    if (existingUser) {
      return respondWithError('Email already exists');
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        console.log('Error generating salt for register', err);
        return respondWithError('There was an error. Please try again later');
      }
      bcrypt.hash(password, salt, null, async (err, hash) => {
        if (err) {
          console.log('Error hashing password for register', err);
          return respondWithError('There was an error. Please try again later');
        }
        try {
          const user = await User.create({name: name, email: email, password: hash});

          const transporter = nodemailer.createTransport(smtpConf);

          // don't send emails if it is in demo mode
          if (process.env.DEMO != 'yes') {
            try {
              // send mail with defined transport object
              await transporter.sendMail({
                from: '"Creative Tim" <' + smtpConf.auth.user + '>',
                to: email, // list of receivers
                subject: 'Creative Tim Confirm Account', // Subject line
                // eslint-disable-next-line max-len
                html: '<h1>Hey,</h1><br><p>Confirm your new account </p><p><a href="' + 'http://localhost:3000/auth/confirm-email/' + user._id + '">"' + 'http://localhost:3000/auth/confirm-email/' + user._id + '"</a><br><br>If you did not ask for it, please let us know immediately at <a href="mailto:' + smtpConf.auth.user + '">' + smtpConf.auth.user + '</a></p>', // html body
              });
            } catch (mailErr) {
              console.log('Error sending confirmation email', mailErr);
            }
            return res.json({success: true, msg: 'The user was succesfully registered'});
          }
          return res.json({success: true, userID: user._id, msg: 'The user was succesfully registered'});
        } catch (createErr) {
          console.log('Error creating user', createErr);
          return respondWithError('There was an error. Please try again later');
        }
      });
    });
  }).catch((err) => {
    console.log('Error checking existing user', err);
    return respondWithError('There was an error. Please try again later');
  });
});

router.post('/confirm/:id', async (req, res) => {
  const userID = req.params.id;

  try {
    const user = await User.updateById(userID, {accountConfirmation: true});
    if (!user) {
      return res.json({success: false});
    }
    return res.json({success: true});
  } catch (err) {
    console.log('Error confirming user', err);
    return res.json({success: false});
  }
});

router.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  User.findByEmail(email).then((user) => {
    if (!user) {
      return res.json({success: false, msg: 'Wrong credentials'});
    }

    if (!user.accountConfirmation) {
      return res.json({success: false, msg: 'Account is not confirmed'});
    }

    bcrypt.compare(password, user.password, async function(err, isMatch) {
      if (err) {
        console.log('Error comparing passwords on login', err);
        return res.json({success: false, msg: 'Wrong credentials'});
      }
      if (isMatch) {
        try {
          const payload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            accountConfirmation: user.accountConfirmation,
          };
          const token = jwt.sign(payload, secret, {
            expiresIn: 86400, // 1 week
          });
          // Don't include the password in the returned user object
          await ActiveSession.create({userId: user._id, token: 'JWT ' + token});
          user.password = null;
          return res.json({
            success: true,
            token: 'JWT ' + token,
            user,
          });
        } catch (sessionErr) {
          console.log('Error creating active session', sessionErr);
          return res.json({success: false, msg: 'There was an error. Please try again later'});
        }
      } else {
        return res.json({success: false, msg: 'Wrong credentials'});
      }
    });
  }).catch((err) => {
    console.log('Error finding user on login', err);
    return res.json({success: false, msg: 'Wrong credentials'});
  });
});

router.post('/checkSession', reqAuth, function(req, res) {
  res.json({success: true});
});

router.post('/logout', reqAuth, async function(req, res) {
  const token = req.body.token;
  try {
    await ActiveSession.deleteByToken(token);
    return res.json({success: true});
  } catch (err) {
    console.log('Error deleting session on logout', err);
    return res.json({success: false});
  }
});

module.exports = router;
