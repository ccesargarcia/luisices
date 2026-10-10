const { HttpsError } = require('firebase-functions/v2/https');

async function authorizeChat(request, phone, { db, assertActiveSession, customerId, create = false }) {
  const { uid, profile } = await assertActiveSession(request);
  const admin = profile.role === 'admin';
  if (!admin && (!['user', 'funcionario'].includes(profile.role) || profile.permissions?.whatsapp !== true)) {
    throw new HttpsError('permission-denied', 'Sem permissão de WhatsApp.');
  }
  let customerOwner = null;
  if (customerId) {
    if (typeof customerId !== 'string' || customerId.includes('/') || customerId.length > 128) {
      throw new HttpsError('invalid-argument', 'Cliente inválido.');
    }
    const customer = await db.collection('customers').doc(customerId).get();
    if (!customer.exists) throw new HttpsError('not-found', 'Cliente não encontrado.');
    customerOwner = customer.data().userId;
    if (!customerOwner || (!admin && customerOwner !== uid)) {
      throw new HttpsError('permission-denied', 'Cliente fora do seu parceiro.');
    }
  }
  const ref = db.collection('whatsapp_chats').doc(phone);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      const owner = snapshot.data().userId;
      if ((!admin && owner !== uid) || (customerOwner && customerOwner !== owner)) {
        throw new HttpsError('permission-denied', 'Conversa fora do parceiro ou sem vínculo confirmado.');
      }
      return owner || null;
    }
    if (!create) throw new HttpsError('not-found', 'Conversa não encontrada.');
    const owner = customerOwner || uid;
    transaction.set(ref, { id: phone, phone, userId: owner });
    return owner;
  });
}

module.exports = { authorizeChat };
