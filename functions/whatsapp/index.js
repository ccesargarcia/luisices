/**
 * Módulo de Integração com WhatsApp (Evolution API e Webhooks).
 */

const functions = require('firebase-functions');
const { onCall, onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { EVOLUTION_API_KEY, ORIGIN_SECRET } = require('../common/secrets');
const {
  EVOLUTION_API_URL,
  EVOLUTION_INSTANCE,
} = require('../common/helpers');
const { validateOriginSecret } = require('../originProtection');

/**
 * Validador de autorização operacional para WhatsApp (admin, user com permissão ou funcionário com permissão)
 */
const { safeEqual, getIntegration, getScope, chatIdFor, messageIdFor, findCustomer, validateCustomer, normalizeWhatsAppNumber } = require('./security');
const isAuthorizedForWhatsApp = async (request) => {
  try { await getScope(request); return true; } catch { return false; }
};

/**
 * Dispara uma mensagem WhatsApp diretamente para o cliente via Evolution API e armazena na base do chat.
 */
const sendWhatsAppDirectMessage = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  async (request) => {
    const scope = await getScope(request);

    const { phone, text, customerName, customerId } = request.data || {};
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Telefone do destinatário é obrigatório.');
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Texto da mensagem é obrigatório.');
    }

    const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    if (!rawKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Chave EVOLUTION_API_KEY não configurada no Firebase Secret Manager.');
    }

    try {
      const cleanNumber = normalizeWhatsAppNumber(phone);
      if (!/^\d{10,15}$/.test(cleanNumber)) throw new functions.https.HttpsError('invalid-argument', 'Telefone inválido.');
      const customer = await validateCustomer(scope.ownerUid, customerId, cleanNumber);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
        {
          method: 'POST',
          headers: {
            apikey: rawKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: cleanNumber, text: text.trim() }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[sendWhatsAppDirectMessage] Evolution API erro:', response.status, errBody);
        throw new functions.https.HttpsError('internal', `Evolution API retornou erro ${response.status}: ${errBody}`);
      }

      const resData = await response.json().catch(() => ({}));
      const messageId = resData?.key?.id || `msg_${Date.now()}`;
      const nowIso = new Date().toISOString();

      await admin.firestore().collection('whatsapp_messages').doc(messageIdFor(scope.ownerUid, messageId)).set({
        chatId: chatIdFor(scope.ownerUid, cleanNumber),
        phone: cleanNumber,
        customerName: customer.customerName,
        customerId: customer.customerId,
        sender: 'me',
        text: text.trim(),
        status: 'sent',
        timestamp: nowIso,
        evolutionMessageId: messageId,
        sentByUid: request.auth.uid,
        userId: scope.ownerUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await admin.firestore().collection('whatsapp_chats').doc(chatIdFor(scope.ownerUid, cleanNumber)).set({
        id: chatIdFor(scope.ownerUid, cleanNumber),
        phone: cleanNumber,
        customerName: customer.customerName,
        customerId: customer.customerId,
        lastMessageText: text.trim(),
        lastMessageTimestamp: nowIso,
        lastMessageSender: 'me',
        userId: scope.ownerUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('[sendWhatsAppDirectMessage] Mensagem enviada com sucesso para:', cleanNumber);
      return {
        success: true,
        message: 'Mensagem enviada com sucesso para o WhatsApp!',
        data: resData,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('[sendWhatsAppDirectMessage] Falha ao enviar mensagem:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Erro ao conectar com a API do WhatsApp.');
    }
  }
);

/**
 * Exclui uma mensagem do WhatsApp (para todos) e remove da base do Firestore.
 */
const deleteWhatsAppMessage = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  async (request) => {
    const scope = await getScope(request);

    const { messageDocId, evolutionMessageId: requestedEvolutionId } = request.data || {};
    const targetId = messageDocId || (typeof requestedEvolutionId === 'string' && requestedEvolutionId
      ? messageIdFor(scope.ownerUid, requestedEvolutionId) : null);
    if (typeof targetId !== 'string' || !targetId || targetId.includes('/')) {
      throw new functions.https.HttpsError('invalid-argument', 'Identificador da mensagem é obrigatório.');
    }
    const messageRef = admin.firestore().collection('whatsapp_messages').doc(targetId);
    const messageSnap = await messageRef.get();
    const message = messageSnap.exists ? messageSnap.data() : null;
    if (!message || message.userId !== scope.ownerUid) {
      throw new functions.https.HttpsError('permission-denied', 'Mensagem não pertence à integração.');
    }
    const evolutionMessageId = message.evolutionMessageId;
    const cleanNumber = normalizeWhatsAppNumber(String(message.phone || ''));
    const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';

    if (rawKey && evolutionMessageId && cleanNumber) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const remoteJid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;

        const response = await fetch(
          `${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
          {
            method: 'DELETE',
            headers: {
              apikey: rawKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: evolutionMessageId,
              remoteJid,
              fromMe: true,
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`[deleteWhatsAppMessage] Aviso ao apagar na API (${response.status}):`, await response.text().catch(() => ''));
        }
      } catch (err) {
        console.warn('[deleteWhatsAppMessage] Falha de rede ao tentar apagar na API do WhatsApp:', err.message);
      }
    }

    try {
      await messageRef.delete();

    } catch (err) {
      console.error('[deleteWhatsAppMessage] Erro ao deletar documento no Firestore:', err);
    }

    if (cleanNumber) {
      try {
        const lastMsgSnap = await admin.firestore()
          .collection('whatsapp_messages')
          .where('userId', '==', scope.ownerUid)
          .where('chatId', '==', chatIdFor(scope.ownerUid, cleanNumber))
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (!lastMsgSnap.empty) {
          const lastMsg = lastMsgSnap.docs[0].data();
          await admin.firestore().collection('whatsapp_chats').doc(chatIdFor(scope.ownerUid, cleanNumber)).set({
            userId: scope.ownerUid,
            id: chatIdFor(scope.ownerUid, cleanNumber),
            phone: cleanNumber,
            lastMessageText: lastMsg.text || '',
            lastMessageTimestamp: lastMsg.timestamp || new Date().toISOString(),
            lastMessageSender: lastMsg.sender || 'me',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        } else {
          await admin.firestore().collection('whatsapp_chats').doc(chatIdFor(scope.ownerUid, cleanNumber)).set({
            userId: scope.ownerUid,
            id: chatIdFor(scope.ownerUid, cleanNumber),
            phone: cleanNumber,
            lastMessageText: '',
            lastMessageTimestamp: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      } catch (err) {
        console.warn('[deleteWhatsAppMessage] Erro ao atualizar resumo do chat:', err);
      }
    }

    return {
      success: true,
      message: 'Mensagem apagada com sucesso!',
    };
  }
);

/**
 * Sincroniza mensagens recentes de um chat diretamente da API do WhatsApp para o Firestore.
 */
const syncWhatsAppChatMessages = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  async (request) => {
    const scope = await getScope(request);

    const { phone } = request.data || {};
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Telefone do contato é obrigatório.');
    }

    const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    if (!rawKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Chave EVOLUTION_API_KEY não configurada no Firebase Secret Manager.');
    }

    const cleanPhone = normalizeWhatsAppNumber(phone);
    if (!/^\d{10,15}$/.test(cleanPhone)) throw new functions.https.HttpsError('invalid-argument', 'Telefone inválido.');
    const remoteJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(
        `${EVOLUTION_API_URL}/chat/findMessages/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
        {
          method: 'POST',
          headers: {
            apikey: rawKey,
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

      const { customerName, customerId } = await findCustomer(scope.ownerUid, cleanPhone);

      let syncedCount = 0;
      let latestMessageText = '';
      let latestTimestamp = '';
      let latestSender = 'me';

      for (const item of messagesList) {
        const key = item?.key;
        const msg = item?.message;
        if (!key?.id) continue;

        const fromMe = Boolean(key?.fromMe);
        const text =
          msg?.conversation ||
          msg?.extendedTextMessage?.text ||
          msg?.imageMessage?.caption ||
          msg?.videoMessage?.caption ||
          msg?.documentMessage?.caption ||
          (msg?.imageMessage ? '📷 [Foto]' : msg?.audioMessage ? '🎵 [Áudio]' : msg?.documentMessage ? '📄 [Documento]' : '');

        if (!text) continue;

        const epochSec = item.messageTimestamp || key.messageTimestamp;
        const tsIso = epochSec ? new Date(Number(epochSec) * 1000).toISOString() : new Date().toISOString();

        const msgDocId = messageIdFor(scope.ownerUid, key.id);
        await admin.firestore().collection('whatsapp_messages').doc(msgDocId).set({
          userId: scope.ownerUid,
          chatId: chatIdFor(scope.ownerUid, cleanPhone),
          phone: cleanPhone,
          customerName,
          customerId,
          sender: fromMe ? 'me' : 'customer',
          text,
          status: fromMe ? 'sent' : 'received',
          timestamp: tsIso,
          evolutionMessageId: key.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        syncedCount++;
        latestMessageText = text;
        latestTimestamp = tsIso;
        latestSender = fromMe ? 'me' : 'customer';
      }

      if (syncedCount > 0 && latestMessageText) {
        await admin.firestore().collection('whatsapp_chats').doc(chatIdFor(scope.ownerUid, cleanPhone)).set({
          userId: scope.ownerUid,
          id: chatIdFor(scope.ownerUid, cleanPhone),
          phone: cleanPhone,
          customerName,
          customerId,
          lastMessageText: latestMessageText,
          lastMessageTimestamp: latestTimestamp,
          lastMessageSender: latestSender,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      return {
        success: true,
        count: syncedCount,
        message: `${syncedCount} mensagem(ns) sincronizada(s) com sucesso!`,
      };
    } catch (err) {
      console.error('[syncWhatsAppChatMessages] Erro:', err);
      throw new functions.https.HttpsError('internal', err.message || 'Erro ao sincronizar mensagens.');
    }
  }
);

/**
 * Consulta o status da conexão da instância com o WhatsApp (open, connecting, close).
 */
const getWhatsAppInstanceStatus = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  async (request) => {
    const scope = await getScope(request);

    const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    if (!rawKey) {
      return {
        connected: false,
        state: 'missing_key',
        instance: EVOLUTION_INSTANCE,
        message: 'Chave de integração não configurada.',
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(EVOLUTION_INSTANCE)}`,
        {
          method: 'GET',
          headers: { apikey: rawKey },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const state = data?.instance?.state || data?.state || 'unknown';
        return {
          connected: state === 'open',
          state,
          instance: EVOLUTION_INSTANCE,
          serverUrl: EVOLUTION_API_URL,
        };
      }

      return {
        connected: false,
        state: 'error',
        status: response.status,
        instance: EVOLUTION_INSTANCE,
      };
    } catch (err) {
      return {
        connected: false,
        state: 'unreachable',
        error: err.message,
        instance: EVOLUTION_INSTANCE,
      };
    }
  }
);

/**
 * Webhook para receber mensagens recebidas (MESSAGES_UPSERT) da API do WhatsApp em tempo real.
 */
const evolutionWhatsAppWebhook = onRequest(
  { secrets: [EVOLUTION_API_KEY, ORIGIN_SECRET] },
  async (req, res) => {
    const originCheck = validateOriginSecret(req);
    if (!originCheck.allowed) {
      console.warn('[evolutionWhatsAppWebhook] Tentativa de acesso direto bloqueada (sem header da Cloudflare)');
      return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    let expectedApiKey;
    try {
      expectedApiKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY);
    } catch {
      return res.status(503).json({ error: 'Webhook security configuration unavailable' });
    }
    if (typeof expectedApiKey !== 'string' || !expectedApiKey) {
      return res.status(503).json({ error: 'Webhook security configuration unavailable' });
    }
    // Não aceita credenciais na URL, que podem vazar em logs.
    const providedApiKey = req.headers['x-api-key'] || req.headers.apikey
      || (typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null);
    if (!safeEqual(expectedApiKey, providedApiKey)) {
      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }
    try {
      const config = await getIntegration();
      const scope = { ownerUid: config.ownerUid };
      if (req.body?.instance !== EVOLUTION_INSTANCE) {
        return res.status(400).json({ error: 'Unexpected WhatsApp instance' });
      }
      const event = req.body?.event;
      const data = req.body?.data;

      if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
        const msg = data?.message || data;
        const key = data?.key || msg?.key;
        const fromMe = Boolean(key?.fromMe);
        const remoteJid = key?.remoteJid || '';

        if (remoteJid && !remoteJid.includes('@g.us') && !remoteJid.includes('status@broadcast')) {
          const cleanPhone = remoteJid.replace(/\D/g, '');
          const messageText =
            msg?.conversation ||
            msg?.extendedTextMessage?.text ||
            msg?.imageMessage?.caption ||
            msg?.videoMessage?.caption ||
            msg?.documentMessage?.caption ||
            (msg?.imageMessage ? '📷 [Foto]' : msg?.audioMessage ? '🎵 [Áudio]' : msg?.documentMessage ? '📄 [Documento]' : '');

          if (cleanPhone && messageText) {
            const nowIso = new Date().toISOString();

            const { customerName, customerId } = await findCustomer(scope.ownerUid, cleanPhone);

            if (typeof key?.id !== 'string' || !key.id) return res.status(400).json({ error: 'Message identifier required' });
            const messageRef = admin.firestore().collection('whatsapp_messages').doc(messageIdFor(scope.ownerUid, key.id));
            const chatRef = admin.firestore().collection('whatsapp_chats').doc(chatIdFor(scope.ownerUid, cleanPhone));
            await admin.firestore().runTransaction(async (transaction) => {
              if ((await transaction.get(messageRef)).exists) return;
              transaction.set(messageRef, {
                userId: scope.ownerUid, chatId: chatIdFor(scope.ownerUid, cleanPhone),
                phone: cleanPhone, customerName, customerId,
                sender: fromMe ? 'me' : 'customer', text: messageText,
                status: fromMe ? 'sent' : 'received', timestamp: nowIso,
                evolutionMessageId: key.id, createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              transaction.set(chatRef, {
                userId: scope.ownerUid, id: chatIdFor(scope.ownerUid, cleanPhone),
                phone: cleanPhone, customerName, customerId,
                lastMessageText: messageText, lastMessageTimestamp: nowIso,
                lastMessageSender: fromMe ? 'me' : 'customer',
                unreadCount: fromMe ? 0 : admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }, { merge: true });
            });
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[evolutionWhatsAppWebhook] Erro ao processar webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = {
  isAuthorizedForWhatsApp,
  sendWhatsAppDirectMessage,
  deleteWhatsAppMessage,
  syncWhatsAppChatMessages,
  getWhatsAppInstanceStatus,
  evolutionWhatsAppWebhook,
};
