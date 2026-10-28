/** WhatsApp callable entrypoint. Keep this module isolated per operation. */
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
const { isAuthorizedForWhatsApp } = require('./authorization');

let moduleInitializationMs = null;
const chatScope = (request, phone, options = {}) => authorizeChat(request, phone, {
  db: getFirestore(), assertActiveSession, ...options,
});

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

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { sendWhatsAppDirectMessage };
