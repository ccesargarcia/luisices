const crypto = require('node:crypto');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { RESEND_API_KEY, EVOLUTION_API_KEY } = require('../common/secrets');
const { activateInvitedAccount } = require('./invitationActivation');
const { createUserInvitationCore } = require('./createUserInvitationCore');
const { consumeAdminUserAction } = require('./userAdminActions');
const { writeUserAudit } = require('./userAudit');
const {
  getResend,
  sendWhatsAppMessage,
  getAppUrl,
  getNoReplySender,
  isAdminRequest,
  hashToken,
  formatActionLink,
} = require('../common/helpers');

async function createCustomVerificationLink(email, inviteToken) {
  const continueUrl = `${getAppUrl()}/action?mode=verifyEmail&invite=${encodeURIComponent(inviteToken)}`;
  const rawLink = await getAuth().generateEmailVerificationLink(email, { url: continueUrl });
  const customLink = formatActionLink(rawLink, 'verifyEmail');
  const verificationUrl = new URL(customLink);
  verificationUrl.searchParams.set('invite', inviteToken);
  return verificationUrl.toString();
}

const createUserInvitation = onCall(
  { maxInstances: 5, secrets: [RESEND_API_KEY, EVOLUTION_API_KEY] },
  async (request) => {
    if (!(await isAdminRequest(request))) {
      throw new HttpsError('permission-denied', 'Apenas administradores podem enviar convites.');
    }
    await consumeAdminUserAction(request.auth.uid);

    return createUserInvitationCore(request, {
      db: getFirestore(),
      getUserByEmail: (email) => getAuth().getUserByEmail(email),
      createToken: () => crypto.randomBytes(32).toString('hex'),
      hashToken,
      Timestamp,
      FieldValue,
      getResend,
      resendApiKey: () => RESEND_API_KEY.value(),
      getAppUrl,
      getNoReplySender,
      sendWhatsAppMessage,
      createCustomVerificationLink,
      activateInvitedAccount,
      writeUserAudit,
      HttpsError,
    });
  }
);

module.exports = { createUserInvitation };
