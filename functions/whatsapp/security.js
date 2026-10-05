const crypto = require('crypto');
const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
function normalizeWhatsAppNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if ((digits.length === 10 || digits.length === 11)) return `55${digits}`;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function safeEqual(expected, provided) {
  if (typeof expected !== 'string' || !expected || typeof provided !== 'string') return false;
  const a = crypto.createHash('sha256').update(expected).digest();
  const b = crypto.createHash('sha256').update(provided).digest();
  return crypto.timingSafeEqual(a, b);
}

async function getIntegration(callerUid = null) {
  const configRef = admin.firestore().doc('integrationSettings/whatsapp');
  let snap = await configRef.get();

  // Auto-provisionamento: se a configuração ainda não existir, inicializa automaticamente com o primeiro admin ativo
  if (!snap.exists) {
    let candidateUid = null;
    if (callerUid) {
      const callerSnap = await admin.firestore().doc(`userProfiles/${callerUid}`).get();
      if (callerSnap.exists && callerSnap.data()?.role === 'admin' && callerSnap.data()?.active !== false) {
        candidateUid = callerUid;
      }
    }
    if (!candidateUid) {
      const adminQuery = await admin.firestore().collection('userProfiles')
        .where('role', '==', 'admin')
        .where('active', '==', true)
        .limit(1)
        .get();
      if (!adminQuery.empty) {
        candidateUid = adminQuery.docs[0].id;
      }
    }
    if (candidateUid) {
      await configRef.set({ ownerUid: candidateUid, enabled: true });
      snap = await configRef.get();
    }
  }

  const config = snap.exists ? snap.data() : {};
  if (config.enabled !== true || typeof config.ownerUid !== 'string' || !config.ownerUid || config.ownerUid.includes('/')) {
    throw new HttpsError('failed-precondition', 'Configure o proprietário da integração WhatsApp antes de utilizá-la.');
  }
  const owner = await admin.firestore().doc(`userProfiles/${config.ownerUid}`).get();
  if (!owner.exists || owner.data().active === false || !['admin', 'user'].includes(owner.data().role)) {
    throw new HttpsError('failed-precondition', 'Proprietário da integração WhatsApp inválido ou desativado.');
  }
  return config;
}

async function getScope(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  const snap = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
  const p = snap.exists ? snap.data() : null;
  if (!p || p.active === false) throw new HttpsError('permission-denied', 'Perfil ausente ou desativado.');
  const config = await getIntegration(request.auth.uid);
  const allowed = p.role === 'admin'
    || (p.role === 'user' && request.auth.uid === config.ownerUid && p.permissions?.whatsapp !== false)
    || (p.role === 'funcionario' && p.createdBy === config.ownerUid && p.permissions?.whatsapp === true);
  if (!allowed) throw new HttpsError('permission-denied', 'Sem permissão para esta integração WhatsApp.');
  return { ownerUid: config.ownerUid, uid: request.auth.uid };
}

const chatIdFor = (ownerUid, phone) => `${ownerUid}_${phone}`;
const messageIdFor = (ownerUid, id) => `${ownerUid}_wa_${crypto.createHash('sha256').update(String(id)).digest('hex')}`;

async function findCustomer(ownerUid, phone) {
  // Telefones legados podem conter pontuação. Pagina somente os clientes do proprietário.
  let query = admin.firestore().collection('customers').where('userId', '==', ownerUid).orderBy('__name__').limit(200);
  let cursor;
  for (let page = 0; page < 50; page++) {
    const snap = await (cursor ? query.startAfter(cursor) : query).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (normalizeWhatsAppNumber(String(data.phone || '')) === phone) return { customerId: doc.id, customerName: data.name || phone };
    }
    if (snap.docs.length < 200) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  return { customerId: null, customerName: phone };
}

async function validateCustomer(ownerUid, customerId, phone) {
  if (!customerId) return findCustomer(ownerUid, phone);
  if (typeof customerId !== 'string' || customerId.includes('/')) throw new HttpsError('invalid-argument', 'Cliente inválido.');
  const snap = await admin.firestore().doc(`customers/${customerId}`).get();
  const data = snap.exists ? snap.data() : null;
  if (!data || data.userId !== ownerUid || normalizeWhatsAppNumber(String(data.phone || '')) !== phone) {
    throw new HttpsError('permission-denied', 'Cliente não pertence à integração ou telefone divergente.');
  }
  return { customerId: snap.id, customerName: data.name || phone };
}

module.exports = { safeEqual, getIntegration, getScope, chatIdFor, messageIdFor, findCustomer, validateCustomer, normalizeWhatsAppNumber };
