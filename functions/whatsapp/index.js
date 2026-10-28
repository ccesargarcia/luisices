/**
 * Módulo de Integração com WhatsApp (Evolution API e Webhooks).
 */

const moduleInitializationStartedAt = process.hrtime.bigint();

const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { EVOLUTION_API_KEY } = require('../common/secrets');
const {
  EVOLUTION_API_URL,
  EVOLUTION_INSTANCE,
  normalizeWhatsAppNumber,
  assertActiveSession,
} = require('../common/helpers');
const { whatsappMessageLimiter } = require('../common/rateLimiters');
const { withFirstInvocationSpan } = require('../common/sentry');

const { authorizeChat } = require('./chatScope');
let moduleInitializationMs = null;
const chatScope = (request, phone, options = {}) => authorizeChat(request, phone, { db: getFirestore(), assertActiveSession, ...options });

/**
 * Validador de autorização operacional para WhatsApp (admin, user com permissão ou funcionário com permissão)
 */
const isAuthorizedForWhatsApp = async (request) => {
  try {
    const { profile: data } = await assertActiveSession(request);
    if (data.role === 'admin') return true;
    if (data.role === 'user') return data.permissions?.whatsapp === true;
    return data.role === 'funcionario' && data.permissions?.whatsapp === true;
  } catch {
    return false;
  }
};

/**
 * Dispara uma mensagem WhatsApp diretamente para o cliente via Evolution API e armazena na base do chat.
 */
const sendWhatsAppDirectMessage = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  withFirstInvocationSpan('sendWhatsAppDirectMessage', async (request) => {
    if (!(await isAuthorizedForWhatsApp(request))) {
      throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
    }

    let requestRef = null;
    let ownsRequest = false;
    try {
      await whatsappMessageLimiter.consume(request.auth.uid);
    } catch {
      throw new HttpsError('resource-exhausted', 'Limite de mensagens do WhatsApp atingido. Tente novamente mais tarde.');
    }

    const { phone, text, customerName, customerId, requestId } = request.data || {};
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      throw new HttpsError('invalid-argument', 'Telefone do destinatário é obrigatório.');
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new HttpsError('invalid-argument', 'Texto da mensagem é obrigatório.');
    }
    if (text.length > 4096) {
      throw new HttpsError('invalid-argument', 'A mensagem não pode ultrapassar 4096 caracteres.');
    }
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(requestId)) {
      throw new HttpsError('invalid-argument', 'Identificador de envio inválido.');
    }

    if (customerName != null && (typeof customerName !== 'string' || customerName.length > 200)) {
      throw new HttpsError('invalid-argument', 'Nome do cliente inválido.');
    }

    const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    if (!rawKey) {
      throw new HttpsError('failed-precondition', 'Chave EVOLUTION_API_KEY não configurada no Firebase Secret Manager.');
    }

    try {
      const cleanNumber = normalizeWhatsAppNumber(phone);
      if (!/^55\d{10,11}$/.test(cleanNumber)) {
        throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
      }
      let verifiedCustomerName = null;
      let verifiedCustomerId = null;
      if (customerId) {
        if (typeof customerId !== 'string' || customerId.length > 128) {
          throw new HttpsError('invalid-argument', 'Cliente inválido.');
        }
        const customer = await getFirestore().collection('customers').doc(customerId).get();
        if (!customer.exists || normalizeWhatsAppNumber(customer.data().phone) !== cleanNumber) {
          throw new HttpsError('invalid-argument', 'Cliente não corresponde ao telefone informado.');
        }
        verifiedCustomerName = customer.data().name || null;
        verifiedCustomerId = customerId;
      }
      const chatOwner = await chatScope(request, cleanNumber, { customerId, create: true });
      requestRef = getFirestore().collection('whatsappSendRequests')
        .doc(`${request.auth.uid}_${requestId}`);
      let existingRequest = null;
      await getFirestore().runTransaction(async (transaction) => {
        existingRequest = (await transaction.get(requestRef)).data() || null;
        if (existingRequest?.status === 'failed') {
          transaction.update(requestRef, {
            status: 'processing',
            retryAt: FieldValue.serverTimestamp(),
            error: FieldValue.delete(),
          });
          existingRequest = null;
          ownsRequest = true;
          return;
        }
        if (existingRequest) return;
        transaction.create(requestRef, {
          status: 'processing',
          uid: request.auth.uid,
          phone: cleanNumber,
          createdAt: FieldValue.serverTimestamp(),
        });
        ownsRequest = true;
      });
      if (existingRequest?.status === 'completed') {
        return existingRequest.result;
      }
      if (existingRequest) {
        throw new HttpsError('aborted', 'Este envio já está sendo processado.');
      }
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
        let errData = null;
        try {
          errData = JSON.parse(errBody);
        } catch {
          // Algumas versões da Evolution retornam texto puro.
        }
        const messages = Array.isArray(errData?.response?.message) ? errData.response.message : [];
        const numberNotRegistered = messages.some((item) => item && item.exists === false);
        console.error('[sendWhatsAppDirectMessage] Evolution API erro:', response.status, {
          numberNotRegistered,
          providerError: errData?.error || errData?.message || 'unknown',
        });

        if (numberNotRegistered) {
          throw new HttpsError(
            'failed-precondition',
            'Este número não possui uma conta WhatsApp ativa ou não está disponível para receber mensagens.'
          );
        }
        const statusCode = response.status === 400
          ? 'invalid-argument'
          : response.status === 401 || response.status === 403
            ? 'failed-precondition'
            : response.status === 404
              ? 'not-found'
              : response.status === 429
                ? 'resource-exhausted'
                : response.status >= 500
                  ? 'unavailable'
                  : 'internal';
        throw new HttpsError(
          statusCode,
          response.status === 429
            ? 'A Evolution API está limitando os envios. Aguarde alguns instantes e tente novamente.'
            : 'Não foi possível enviar a mensagem pela Evolution API.'
        );
      }

      const resData = await response.json().catch(() => ({}));
      const messageId = resData?.key?.id || `msg_${Date.now()}`;
      const nowIso = new Date().toISOString();

      await getFirestore().collection('whatsapp_messages').add({
        chatId: cleanNumber,
        phone: cleanNumber,
        customerName: verifiedCustomerName,
        customerId: verifiedCustomerId,
        sender: 'me',
        text: text.trim(),
        status: 'sent',
        timestamp: nowIso,
        evolutionMessageId: messageId,
        sentByUid: request.auth.uid,
        userId: chatOwner,
        createdAt: FieldValue.serverTimestamp(),
      });

      await getFirestore().collection('whatsapp_chats').doc(cleanNumber).set({
        id: cleanNumber,
        phone: cleanNumber,
        customerName: verifiedCustomerName || cleanNumber,
        customerId: verifiedCustomerId,
        lastMessageText: text.trim(),
        lastMessageTimestamp: nowIso,
        lastMessageSender: 'me',
        userId: chatOwner,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      const result = {
        success: true,
        message: 'Mensagem enviada com sucesso para o WhatsApp!',
        emailId: messageId,
        data: resData,
      };
      await requestRef.set({
        status: 'completed',
        result,
        completedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('[sendWhatsAppDirectMessage] Mensagem enviada com sucesso para:', cleanNumber);
      return result;
    } catch (error) {
      if (requestRef && ownsRequest) {
        try {
          await requestRef.set({
            status: 'failed',
            failedAt: FieldValue.serverTimestamp(),
            error: error instanceof HttpsError ? error.code : 'internal',
          }, { merge: true });
        } catch (stateError) {
          console.error('[sendWhatsAppDirectMessage] Não foi possível atualizar o estado idempotente:', stateError);
        }
      }
      if (error instanceof HttpsError) throw error;
      console.error('[sendWhatsAppDirectMessage] Falha ao enviar mensagem:', error);
      throw new HttpsError('internal', error.message || 'Erro ao conectar com a API do WhatsApp.');
    }
  }, () => moduleInitializationMs)
);

/**
 * Exclui uma mensagem do WhatsApp (para todos) e remove da base do Firestore.
 */
const deleteWhatsAppMessage = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  withFirstInvocationSpan('deleteWhatsAppMessage', async (request) => {
    if (!(await isAuthorizedForWhatsApp(request))) {
      throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
    }

    const { messageDocId, phone, evolutionMessageId } = request.data || {};
    if ((!messageDocId && !evolutionMessageId) || typeof phone !== 'string' || !phone.trim()) {
      throw new HttpsError('invalid-argument', 'Identificador da mensagem é obrigatório.');
    }

    const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    const cleanNumber = phone ? normalizeWhatsAppNumber(phone) : '';
    if (phone && !/^55\d{10,11}$/.test(cleanNumber)) {
      throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
    }

    const chatOwner = await chatScope(request, cleanNumber);
    if (messageDocId) {
      const target = await getFirestore().collection('whatsapp_messages').doc(String(messageDocId)).get();
      if (!target.exists || target.data().chatId !== cleanNumber || (target.data().userId || null) !== chatOwner) {
        throw new HttpsError('permission-denied', 'A mensagem não pertence a este chat.');
      }
      if (evolutionMessageId && target.data().evolutionMessageId !== evolutionMessageId) {
        throw new HttpsError('invalid-argument', 'Identificadores da mensagem não correspondem.');
      }
    } else if (evolutionMessageId) {
      const target = await getFirestore().collection('whatsapp_messages')
        .where('evolutionMessageId', '==', String(evolutionMessageId))
        .limit(1)
        .get();
      if (target.empty || target.docs[0].data().chatId !== cleanNumber || (target.docs[0].data().userId || null) !== chatOwner) {
        throw new HttpsError('not-found', 'Mensagem não encontrada neste chat.');
      }
    }

    if (evolutionMessageId && !rawKey) {
      throw new HttpsError('failed-precondition', 'Chave da Evolution API não configurada.');
    }

    if (evolutionMessageId && cleanNumber) {
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
          console.warn(`[deleteWhatsAppMessage] Evolution recusou a exclusão remota: status=${response.status}`);
          throw new HttpsError('failed-precondition', 'A Evolution API não confirmou a exclusão remota.');
        }
      } catch (err) {
        if (err instanceof HttpsError) throw err;
        console.warn('[deleteWhatsAppMessage] Falha de rede ao tentar apagar na API do WhatsApp.');
        throw new HttpsError('unavailable', 'Não foi possível confirmar a exclusão no WhatsApp.');
      }
    }

    try {
      if (messageDocId) {
        await getFirestore().collection('whatsapp_messages').doc(messageDocId).delete();
      }
      if (evolutionMessageId) {
        const snap = await getFirestore().collection('whatsapp_messages')
          .where('evolutionMessageId', '==', evolutionMessageId)
          .get();
        for (const d of snap.docs) {
          if (d.data().chatId === cleanNumber) await d.ref.delete();
        }
      }
    } catch (err) {
      console.error('[deleteWhatsAppMessage] Erro ao deletar documento no Firestore:', err);
      throw new HttpsError('internal', 'Não foi possível remover a mensagem do histórico.');
    }

    if (cleanNumber) {
      try {
        const lastMsgSnap = await getFirestore()
          .collection('whatsapp_messages')
          .where('chatId', '==', cleanNumber)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (!lastMsgSnap.empty) {
          const lastMsg = lastMsgSnap.docs[0].data();
          await getFirestore().collection('whatsapp_chats').doc(cleanNumber).set({
            lastMessageText: lastMsg.text || '',
            lastMessageTimestamp: lastMsg.timestamp || new Date().toISOString(),
            lastMessageSender: lastMsg.sender || 'me',
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        } else {
          await getFirestore().collection('whatsapp_chats').doc(cleanNumber).set({
            lastMessageText: '',
            lastMessageTimestamp: null,
            updatedAt: FieldValue.serverTimestamp(),
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
  }, () => moduleInitializationMs)
);

/**
 * Sincroniza mensagens recentes de um chat diretamente da API do WhatsApp para o Firestore.
 */
const syncWhatsAppChatMessages = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  withFirstInvocationSpan('syncWhatsAppChatMessages', async (request) => {
    if (!(await isAuthorizedForWhatsApp(request))) {
      throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
    }

    const { phone } = request.data || {};
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      throw new HttpsError('invalid-argument', 'Telefone do contato é obrigatório.');
    }

    const rawKey = (typeof EVOLUTION_API_KEY.value === 'function' ? EVOLUTION_API_KEY.value() : process.env.EVOLUTION_API_KEY) || '';
    if (!rawKey) {
      throw new HttpsError('failed-precondition', 'Chave EVOLUTION_API_KEY não configurada no Firebase Secret Manager.');
    }

    const cleanPhone = normalizeWhatsAppNumber(phone);
    if (!/^55\d{10,11}$/.test(cleanPhone)) {
      throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
    }
    const chatOwner = await chatScope(request, cleanPhone);
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

      let customerName = cleanPhone;
      let customerId = null;
      try {
        const custSnap = await getFirestore().collection('customers').where('userId', '==', chatOwner || '__unassigned__').limit(100).get();
        for (const d of custSnap.docs) {
          const cData = d.data();
          const cPhone = String(cData.phone || '').replace(/\D/g, '');
          if (cPhone && (cleanPhone.endsWith(cPhone) || cPhone.endsWith(cleanPhone))) {
            customerName = cData.name || customerName;
            customerId = d.id;
            break;
          }
        }
      } catch (e) {
        console.warn('[syncWhatsAppChatMessages] Erro ao buscar cliente:', e);
      }

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

        const msgDocId = `wa_${key.id}`;
        await getFirestore().collection('whatsapp_messages').doc(msgDocId).set({
          userId: chatOwner,
          chatId: cleanPhone,
          phone: cleanPhone,
          customerName,
          customerId,
          sender: fromMe ? 'me' : 'customer',
          text,
          status: fromMe ? 'sent' : 'received',
          timestamp: tsIso,
          evolutionMessageId: key.id,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        syncedCount++;
        latestMessageText = text;
        latestTimestamp = tsIso;
        latestSender = fromMe ? 'me' : 'customer';
      }

      if (syncedCount > 0 && latestMessageText) {
        await getFirestore().collection('whatsapp_chats').doc(cleanPhone).set({
          id: cleanPhone,
          phone: cleanPhone,
          customerName,
          customerId,
          lastMessageText: latestMessageText,
          lastMessageTimestamp: latestTimestamp,
          lastMessageSender: latestSender,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      return {
        success: true,
        count: syncedCount,
        message: `${syncedCount} mensagem(ns) sincronizada(s) com sucesso!`,
      };
    } catch (err) {
      console.error('[syncWhatsAppChatMessages] Erro:', err);
      throw new HttpsError('internal', err.message || 'Erro ao sincronizar mensagens.');
    }
  }, () => moduleInitializationMs)
);

/**
 * Consulta o status da conexão da instância com o WhatsApp (open, connecting, close).
 */
const getWhatsAppInstanceStatus = onCall(
  { maxInstances: 5, secrets: [EVOLUTION_API_KEY] },
  withFirstInvocationSpan('getWhatsAppInstanceStatus', async (request) => {
    if (!(await isAuthorizedForWhatsApp(request))) {
      throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
    }

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
  }, () => moduleInitializationMs)
);

const markWhatsAppChatRead = onCall(withFirstInvocationSpan('markWhatsAppChatRead', async (request) => {
  if (!(await isAuthorizedForWhatsApp(request))) {
    throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
  }
  const { phone } = request.data || {};
  if (typeof phone !== 'string' || !phone.trim()) {
    throw new HttpsError('invalid-argument', 'Telefone do chat é obrigatório.');
  }
  const cleanPhone = normalizeWhatsAppNumber(phone);
  if (!/^55\d{10,11}$/.test(cleanPhone)) {
    throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
  }
  await chatScope(request, cleanPhone);
  await getFirestore().collection('whatsapp_chats').doc(cleanPhone).update({
    unreadCount: 0,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
}, () => moduleInitializationMs));

const ensureWhatsAppConversation = onCall(withFirstInvocationSpan('ensureWhatsAppConversation', async (request) => {
  if (!(await isAuthorizedForWhatsApp(request))) {
    throw new HttpsError('permission-denied', 'Sem permissão para utilizar o módulo de Atendimento (WhatsApp).');
  }
  const { phone, customerName, customerId } = request.data || {};
  if (typeof phone !== 'string' || !phone.trim()) {
    throw new HttpsError('invalid-argument', 'Telefone do chat é obrigatório.');
  }
  if (customerName != null && (typeof customerName !== 'string' || customerName.length > 200)) {
    throw new HttpsError('invalid-argument', 'Nome do cliente inválido.');
  }
  if (customerId != null && (typeof customerId !== 'string' || customerId.length > 128)) {
    throw new HttpsError('invalid-argument', 'Cliente inválido.');
  }
  const cleanPhone = normalizeWhatsAppNumber(phone);
  if (!/^55\d{10,11}$/.test(cleanPhone)) {
    throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido.');
  }
  if (customerId) {
    const customer = await getFirestore().collection('customers').doc(customerId).get();
    if (!customer.exists) {
      throw new HttpsError('invalid-argument', 'Cliente não encontrado.');
    }
    const customerPhone = normalizeWhatsAppNumber(customer.data().phone);
    if (customerPhone !== cleanPhone) {
      throw new HttpsError('invalid-argument', 'Cliente não corresponde ao telefone informado.');
    }
  }
  const chatOwner = await chatScope(request, cleanPhone, { customerId, create: true });
  await getFirestore().collection('whatsapp_chats').doc(cleanPhone).set({
    userId: chatOwner,
    id: cleanPhone,
    phone: cleanPhone,
    customerName: customerName || cleanPhone,
    customerId: customerId || null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { success: true };
}, () => moduleInitializationMs));

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = {
  isAuthorizedForWhatsApp,
  sendWhatsAppDirectMessage,
  deleteWhatsAppMessage,
  syncWhatsAppChatMessages,
  getWhatsAppInstanceStatus,
  markWhatsAppChatRead,
  ensureWhatsAppConversation,
};
