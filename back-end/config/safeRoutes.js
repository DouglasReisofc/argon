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
const ActiveSession = require('../models/activeSession');
const User = require('../models/user');

const reqAuth = async (req, res, next) => {
  const token = String(req.headers.authorization || '').trim();

  if (!token) {
    return res.status(401).json({success: false, msg: 'User is not logged on'});
  }

  try {
    const session = await ActiveSession.findByToken(token);
    if (!session) {
      return res.status(401).json({success: false, msg: 'User is not logged on'});
    }

    const user = await User.findById(session.userId);
    if (!user || !user.isActive) {
      return res.status(403).json({success: false, msg: 'Account is not active'});
    }

    await ActiveSession.touch(token);

    req.user = user;
    req.session = session;
    return next();
  } catch (err) {
    console.log('Error checking active session', err);
    return res.status(500).json({success: false, msg: 'Unable to verify session'});
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({success: false, msg: 'Admin privileges required'});
};

module.exports = {
  reqAuth,
  requireAdmin,
};
