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
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const {secret} = require('../config/keys');
const User = require('../models/user');
const ActiveSession = require('../models/activeSession');
const {reqAuth, requireAdmin} = require('../config/safeRoutes');
const {smtpConf, clientAppUrl} = require('../config/config');
const VerificationCode = require('../models/verificationCode');
const {createLog} = require('../models/auditLog');

const {PURPOSES} = VerificationCode;
const APP_NAME = process.env.APP_NAME || 'GestorVIP';
const CLIENT_URL = (clientAppUrl || 'http://localhost:3000').replace(/\/$/, '');
const IS_DEMO = (process.env.DEMO || '').toLowerCase() === 'yes';

/**
 * Create a nodemailer transporter using the configured SMTP settings.
 * @return {Object} transporter instance.
 */
function buildTransporter() {
  return nodemailer.createTransport(smtpConf);
}

/**
 * Send an email using the configured transporter.
 * @param {Object} message email message payload.
 * @param {string} message.to destination email address.
 * @param {string} message.subject email subject.
 * @param {string} message.html html body.
 * @return {Promise<void>} promise.
 */
async function sendEmail({to, subject, html}) {
  const transporter = buildTransporter();
  await transporter.sendMail({
    from: `"${APP_NAME}" <${smtpConf.auth.user}>`,
    to,
    subject,
    html,
  });
}

/**
 * Remove sensitive fields from a user object before returning to clients.
 * @param {Object} user user payload.
 * @return {Object} sanitized user payload.
 */
function sanitizeUserForResponse(user) {
  if (!user) {
    return user;
  }
  const sanitized = {...user};
  sanitized.password = undefined;
  return sanitized;
}

// route /admin/users/
router.post('/all', reqAuth, requireAdmin, async function(req, res) {
  try {
    const users = await User.findAll();
    const sanitizedUsers = users.map(sanitizeUserForResponse);
    await createLog({userId: req.user._id, action: 'admin.users.list'});
    res.json({success: true, users: sanitizedUsers});
  } catch (err) {
    console.log('Error fetching users', err);
    res.status(500).json({success: false, msg: 'Unable to fetch users'});
  }
});

router.post('/edit', reqAuth, async function(req, res) {
  const {userID, name, email} = req.body;
  if (!userID || !name || !email) {
    return res.status(400).json({success: false, msg: 'Please enter all fields'});
  }

  if (String(req.user._id) !== String(userID) && req.user.role !== 'admin') {
    return res.status(403).json({success: false, msg: 'Not authorized to edit this user'});
  }

  try {
    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({success: false, msg: 'User not found'});
    }

    const existingEmailOwner = await User.findByEmail(email);
    if (existingEmailOwner && String(existingEmailOwner._id) !== String(userID)) {
      return res.json({success: false, msg: 'Email already exists'});
    }

    const updated = await User.updateById(user._id, {name, email});
    if (!updated) {
      return res.status(500).json({success: false, msg: 'There was an error updating the user'});
    }

    await createLog({userId: userID, action: 'user.profile.update'});
    return res.json({success: true});
  } catch (err) {
    console.log('Error updating user', err);
    return res.status(500).json({success: false, msg: 'There was an error updating the user'});
  }
});

router.post('/check/resetpass/:id', async (req, res) => {
  const userID = req.params.id;
  try {
    const user = await User.findById(userID);
    const hasResetCode = await VerificationCode.hasActiveCode(userID, PURPOSES.PASSWORD_RESET);
    if (user && user.resetPass === true && hasResetCode) {
      return res.json({success: true});
    }
  } catch (err) {
    console.log('Error checking reset password flag', err);
  }
  return res.json({success: false});
});

router.post('/resetpass/:id', async (req, res) => {
  const userID = req.params.id;
  const {password, code} = req.body;
  const errors = [];

  if (!password || password.length < 8) {
    errors.push({msg: 'Password must be at least 8 characters'});
  }
  if (!code) {
    errors.push({msg: 'A valid reset code is required'});
  }
  if (errors.length > 0) {
    return res.status(400).json({success: false, msg: errors});
  }

  try {
    const isValid = await VerificationCode.consumeCode(userID, PURPOSES.PASSWORD_RESET, code);
    if (!isValid) {
      return res.status(400).json({success: false, msg: 'Invalid or expired reset code'});
    }

    const hash = await bcrypt.hash(password, 12);
    const updated = await User.updateById(userID, {resetPass: false, password: hash});
    if (!updated) {
      return res.status(500).json({success: false, msg: 'There was an error resetting the password'});
    }

    await createLog({userId: userID, action: 'user.password_reset.complete'});
    return res.json({success: true});
  } catch (err) {
    console.log('Error resetting password', err);
    return res.status(500).json({success: false, msg: 'There was an error resetting the password'});
  }
});

router.post('/forgotpassword', async (req, res) => {
  const {email} = req.body;
  if (!email) {
    return res.status(400).json({success: false, errors: [{msg: 'Please enter all fields'}]});
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.json({success: false, errors: [{msg: 'Email address does not exist'}]});
    }

    await User.updateById(user._id, {resetPass: true});
    const {code} = await VerificationCode.createCode(user._id, PURPOSES.PASSWORD_RESET, 30);
    const resetLink = `${CLIENT_URL}/auth/confirm-password/${user._id}?code=${code}`;

    if (!IS_DEMO) {
      try {
        await sendEmail({
          to: email,
          subject: `${APP_NAME} - Reset your password`,
          html: `<h1>Hello,</h1><p>You requested a password reset. Use the code <strong>${code}</strong> or click the button below within 30 minutes.</p><p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#5e72e4;color:#fff;border-radius:4px;text-decoration:none;">Reset Password</a></p><p>If you did not request this reset please contact <a href="mailto:${smtpConf.auth.user}">${smtpConf.auth.user}</a>.</p>`,
        });
      } catch (mailErr) {
        console.log('Error sending forgot password email', mailErr);
      }
    }

    await createLog({userId: user._id, action: 'user.password_reset.request'});
    return res.json({success: true, userID: user._id, resetCode: IS_DEMO ? code : null});
  } catch (err) {
    console.log('Error processing forgot password', err);
    return res.status(500).json({success: false, errors: [{msg: 'There was an error processing the request'}]});
  }
});

router.post('/register', async (req, res) => {
  const {name, email, password, phone, agency} = req.body;

  const respondWithError = function(message) {
    return res.status(400).json({success: false, msg: message});
  };

  if (!name || !email || !password) {
    return respondWithError('Please enter all fields');
  }

  if (password.length < 8) {
    return respondWithError('Password must be at least 8 characters long');
  }

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return respondWithError('Email already exists');
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hash,
      role: 'user',
      isActive: false,
      accountConfirmation: false,
      resetPass: false,
      profile: {
        phone: phone || null,
        agency: agency || null,
      },
    });

    const {code} = await VerificationCode.createCode(user._id, PURPOSES.EMAIL_CONFIRMATION, 60);
    const confirmationLink = `${CLIENT_URL}/auth/confirm-email/${user._id}?code=${code}`;

    if (!IS_DEMO) {
      try {
        await sendEmail({
          to: email,
          subject: `${APP_NAME} - Confirm your account`,
          html: `<h1>Welcome!</h1><p>Use the confirmation code <strong>${code}</strong> to activate your account or click the button below.</p><p><a href="${confirmationLink}" style="display:inline-block;padding:10px 16px;background:#5e72e4;color:#fff;border-radius:4px;text-decoration:none;">Confirm account</a></p><p>If you did not create this account please ignore this email or contact <a href="mailto:${smtpConf.auth.user}">${smtpConf.auth.user}</a>.</p>`,
        });
      } catch (mailErr) {
        console.log('Error sending confirmation email', mailErr);
      }
    }

    await createLog({userId: user._id, action: 'user.register'});
    return res.json({
      success: true,
      userID: user._id,
      msg: 'The user was succesfully registered',
      confirmationCode: IS_DEMO ? code : null,
    });
  } catch (err) {
    console.log('Error registering user', err);
    return respondWithError('There was an error. Please try again later');
  }
});

router.post('/confirm/:id', async (req, res) => {
  const userID = req.params.id;
  const code = (req.body && req.body.code) || req.query.code;

  if (!code) {
    return res.status(400).json({success: false, msg: 'Confirmation code is required'});
  }

  try {
    const isValid = await VerificationCode.consumeCode(userID, PURPOSES.EMAIL_CONFIRMATION, code);
    if (!isValid) {
      return res.status(400).json({success: false, msg: 'Invalid or expired confirmation code'});
    }

    await User.markAccountConfirmed(userID);
    await createLog({userId: userID, action: 'user.confirm_email'});
    return res.json({success: true});
  } catch (err) {
    console.log('Error confirming user', err);
    return res.status(500).json({success: false, msg: 'Unable to confirm the account'});
  }
});

router.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      await createLog({userId: null, action: 'user.login.failed', details: `Unknown email ${email}`});
      return res.json({success: false, msg: 'Wrong credentials'});
    }

    if (!user.accountConfirmation) {
      return res.json({success: false, msg: 'Account is not confirmed'});
    }

    if (!user.isActive) {
      return res.json({success: false, msg: 'Account is disabled. Contact support.'});
    }

    const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (!isMatch) {
      await createLog({userId: user._id, action: 'user.login.failed', details: 'Wrong password'});
      return res.json({success: false, msg: 'Wrong credentials'});
    }

    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountConfirmation: user.accountConfirmation,
    };
    const token = jwt.sign(payload, secret, {
      expiresIn: 86400, // 1 day
    });

    await ActiveSession.create({
      userId: user._id,
      token: 'JWT ' + token,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    await User.setLastLogin(user._id);
    await createLog({userId: user._id, action: 'user.login'});

    const safeUser = sanitizeUserForResponse(user);
    return res.json({
      success: true,
      token: 'JWT ' + token,
      user: safeUser,
    });
  } catch (err) {
    console.log('Error finding user on login', err);
    return res.status(500).json({success: false, msg: 'There was an error. Please try again later'});
  }
});

router.post('/checkSession', reqAuth, function(req, res) {
  res.json({success: true});
});

router.post('/logout', reqAuth, async function(req, res) {
  const token = req.body.token;
  if (!token) {
    return res.status(400).json({success: false, msg: 'Missing session token'});
  }
  try {
    await ActiveSession.deleteByToken(token);
    await createLog({userId: req.user._id, action: 'user.logout'});
    return res.json({success: true});
  } catch (err) {
    console.log('Error deleting session on logout', err);
    return res.status(500).json({success: false});
  }
});

module.exports = router;
