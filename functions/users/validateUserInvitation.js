const crypto = require('node:crypto');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { validateUserInvitationCore } = require('./validateUserInvitationCore');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const validateUserInvitation = onCall(async (request) => validateUserInvitationCore(request, {
  db: getFirestore(),
  hashToken,
  HttpsError,
}));

module.exports = { validateUserInvitation };
