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
const { withFirstInvocationSpan } = require('../common/sentry');
const { authorizeChat } = require('./chatScope');
const { isAuthorizedForWhatsApp } = require('./authorization');

let moduleInitializationMs = null;
const chatScope = (request, phone, options = {}) => authorizeChat(request, phone, {
  db: getFirestore(), assertActiveSession, ...options,
});

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

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { deleteWhatsAppMessage };
