const crypto = require('node:crypto');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { activateInvitedAccount } = require('./invitationActivation');
const { completeUserInvitationCore } = require('./completeUserInvitationCore');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const completeUserInvitation = onCall(async (request) => completeUserInvitationCore(request, {
  db: getFirestore(),
  hashToken,
  getUser: (uid) => getAuth().getUser(uid),
  getUserByEmail: (email) => getAuth().getUserByEmail(email),
  activateInvitedAccount,
  HttpsError,
}));

module.exports = { completeUserInvitation };
