const { HttpsError } = require('firebase-functions/v2/https');

async function markWhatsAppChatReadCore({ request, db, chatScope, normalizePhone, serverTimestamp }) {
  const { phone } = request.data || {};
  if (typeof phone !== 'string' || !phone.trim()) {
    throw new HttpsError('invalid-argument', 'Telefone do chat é obrigatório.');
  }
  const cleanPhone = normalizePhone(phone);
  if (!/^55\d{10,11}$/.test(cleanPhone)) {
    throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
  }
  await chatScope(request, cleanPhone);
  await db.collection('whatsapp_chats').doc(cleanPhone).update({
    unreadCount: 0,
    updatedAt: serverTimestamp(),
  });
  return { success: true };
}

async function ensureWhatsAppConversationCore({ request, db, chatScope, normalizePhone, serverTimestamp }) {
  const { phone, customerName, customerId } = request.data || {};
  if (typeof phone !== 'string' || !phone.trim()) {
    throw new HttpsError('invalid-argument', 'Telefone do chat é obrigatório.');
  }
  if (customerName != null && (typeof customerName !== 'string' || customerName.length > 200)) {
    throw new HttpsError('invalid-argument', 'Nome do cliente inválido.');
  }
  if (customerId != null && (typeof customerId !== 'string' || customerId.includes('/') || customerId.length > 128)) {
    throw new HttpsError('invalid-argument', 'Cliente inválido.');
  }
  const cleanPhone = normalizePhone(phone);
  if (!/^55\d{10,11}$/.test(cleanPhone)) {
    throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
  }
  if (customerId) {
    const customer = await db.collection('customers').doc(customerId).get();
    if (!customer.exists) {
      throw new HttpsError('invalid-argument', 'Cliente não encontrado.');
    }
    const customerPhone = normalizePhone(customer.data().phone);
    if (customerPhone !== cleanPhone) {
      throw new HttpsError('invalid-argument', 'Cliente não corresponde ao telefone informado.');
    }
  }
  const chatOwner = await chatScope(request, cleanPhone, { customerId, create: true });
  await db.collection('whatsapp_chats').doc(cleanPhone).set({
    userId: chatOwner,
    id: cleanPhone,
    phone: cleanPhone,
    customerName: customerName || cleanPhone,
    customerId: customerId || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { success: true };
}

module.exports = { markWhatsAppChatReadCore, ensureWhatsAppConversationCore };
