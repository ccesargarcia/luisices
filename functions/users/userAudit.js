const { FieldValue, getFirestore } = require('firebase-admin/firestore');

function writeUserAudit(action, actorUid, targetUid, details = {}) {
  return getFirestore().collection('userAuditLogs').add({
    action,
    actorUid,
    ...(targetUid ? { targetUid } : {}),
    ...details,
    createdAt: FieldValue.serverTimestamp(),
  }).catch((error) => {
    console.error('[users] Falha ao registrar auditoria:', error);
  });
}

module.exports = { writeUserAudit };
