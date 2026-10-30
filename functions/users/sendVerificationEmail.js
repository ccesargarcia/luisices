const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { RESEND_API_KEY } = require('../common/secrets');
const { sendVerificationEmailCore } = require('./sendVerificationEmailCore');
const {
  getResend,
  getAppUrl,
  getNoReplySender,
  getContactEmail,
  hashToken,
} = require('../common/helpers');

const sendVerificationEmail = onCall(
  { maxInstances: 5, secrets: [RESEND_API_KEY] },
  async (request) => sendVerificationEmailCore(request, {
    db: getFirestore(),
    getUser: (uid) => getAuth().getUser(uid),
    generateEmailVerificationLink: (email, settings) => getAuth().generateEmailVerificationLink(email, settings),
    hashToken,
    getResend,
    resendApiKey: () => RESEND_API_KEY.value(),
    getAppUrl,
    getNoReplySender,
    getContactEmail,
    HttpsError,
  })
);

module.exports = { sendVerificationEmail };
