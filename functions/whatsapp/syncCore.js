const { HttpsError } = require('firebase-functions/v2/https');

async function syncWhatsAppChatMessagesCore({
  request,
  db,
  chatScope,
  normalizePhone,
  apiKey,
  apiUrl,
  instance,
  serverTimestamp,
  fetchImpl = fetch,
}) {
  const { phone } = request.data || {};
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    throw new HttpsError('invalid-argument', 'Telefone do contato é obrigatório.');
  }

  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Chave EVOLUTION_API_KEY não configurada no Firebase Secret Manager.');
  }

  const cleanPhone = normalizePhone(phone);
  if (!/^55\d{10,11}$/.test(cleanPhone)) {
    throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
  }
  const chatOwner = await chatScope(request, cleanPhone);
  const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetchImpl(
      `${apiUrl}/chat/findMessages/${encodeURIComponent(instance)}`,
      {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid,
            },
          },
          limit: 50,
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[syncWhatsAppChatMessages] Erro ao consultar mensagens (${response.status}):`, errText);
      return { success: false, message: `Não foi possível sincronizar histórico (${response.status}).` };
    }

    const data = await response.json().catch(() => []);
    const messagesList = Array.isArray(data) ? data : data?.messages?.records || data?.records || [];

    let customerName = cleanPhone;
    let customerId = null;
    try {
      const custSnap = await db.collection('customers')
        .where('userId', '==', chatOwner || '__unassigned__')
        .limit(100)
        .get();
      for (const customerDoc of custSnap.docs) {
        const customer = customerDoc.data();
        const customerPhone = String(customer.phone || '').replace(/\D/g, '');
        if (customerPhone && (cleanPhone.endsWith(customerPhone) || customerPhone.endsWith(cleanPhone))) {
          customerName = customer.name || customerName;
          customerId = customerDoc.id;
          break;
        }
      }
    } catch (error) {
      console.warn('[syncWhatsAppChatMessages] Erro ao buscar cliente:', error);
    }

    let syncedCount = 0;
    let latestMessageText = '';
    let latestTimestamp = '';
    let latestSender = 'me';

    for (const item of messagesList) {
      const key = item?.key;
      const message = item?.message;
      if (!key?.id) continue;

      const fromMe = Boolean(key?.fromMe);
      const text =
        message?.conversation ||
        message?.extendedTextMessage?.text ||
        message?.imageMessage?.caption ||
        message?.videoMessage?.caption ||
        message?.documentMessage?.caption ||
        (message?.imageMessage ? '📷 [Foto]' : message?.audioMessage ? '🎵 [Áudio]' : message?.documentMessage ? '📄 [Documento]' : '');

      if (!text) continue;

      const epochSec = item.messageTimestamp || key.messageTimestamp;
      const timestamp = epochSec ? new Date(Number(epochSec) * 1000).toISOString() : new Date().toISOString();

      const messageDocId = `wa_${key.id}`;
      await db.collection('whatsapp_messages').doc(messageDocId).set({
        userId: chatOwner,
        chatId: cleanPhone,
        phone: cleanPhone,
        customerName,
        customerId,
        sender: fromMe ? 'me' : 'customer',
        text,
        status: fromMe ? 'sent' : 'received',
        timestamp,
        evolutionMessageId: key.id,
        createdAt: serverTimestamp(),
      }, { merge: true });

      syncedCount++;
      latestMessageText = text;
      latestTimestamp = timestamp;
      latestSender = fromMe ? 'me' : 'customer';
    }

    if (syncedCount > 0 && latestMessageText) {
      await db.collection('whatsapp_chats').doc(cleanPhone).set({
        id: cleanPhone,
        phone: cleanPhone,
        customerName,
        customerId,
        lastMessageText: latestMessageText,
        lastMessageTimestamp: latestTimestamp,
        lastMessageSender: latestSender,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    return {
      success: true,
      count: syncedCount,
      message: `${syncedCount} mensagem(ns) sincronizada(s) com sucesso!`,
    };
  } catch (error) {
    console.error('[syncWhatsAppChatMessages] Erro:', error);
    throw new HttpsError('internal', error.message || 'Erro ao sincronizar mensagens.');
  }
}

module.exports = { syncWhatsAppChatMessagesCore };
