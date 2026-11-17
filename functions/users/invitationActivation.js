const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('../common/runtimeCompat');
const { activateInvitedAccountCore } = require('./invitationActivationCore');
const { INVITED_USER_PERMISSIONS } = require('./invitedUserPermissions');

function activateInvitedAccount(invitationRef, invitationData, authUser) {
  return activateInvitedAccountCore(invitationRef, invitationData, authUser, {
    db: getFirestore(),
    FieldValue,
    HttpsError,
    invitedUserPermissions: INVITED_USER_PERMISSIONS,
  });
}

module.exports = { activateInvitedAccount };
