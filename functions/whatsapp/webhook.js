/** Recebimento de eventos da Evolution API, isolado das callables do painel. */
const moduleInitializationStartedAt = process.hrtime.bigint();
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onRequest } = require('../common/sentryFunctions');
const { EVOLUTION_API_KEY, ORIGIN_SECRET } = require('../common/secrets');
const { validateOriginSecret } = require('../originProtection');
const { withFirstInvocationSpan } = require('../common/sentry');
const { persistIncomingMessage } = require('./persistMessage');

const MAX_WEBHOOK_BYTES = 1024 * 1024;
let moduleInitializationMs = null;

/**
 * Webhook para receber mensagens recebidas (MESSAGES_UPSERT) da API do WhatsApp em tempo real.
 */
const evolutionWhatsAppWebhook = onRequest(
  { secrets: [EVOLUTION_API_KEY, ORIGIN_SECRET] },
  withFirstInvocationSpan('evolutionWhatsAppWebhook', async (req, res) => {
    const originCheck = validateOriginSecret(req);
    if (!originCheck.allowed) {
      console.warn('[evolutionWhatsAppWebhook] Tentativa de acesso direto bloqueada (sem header da Cloudflare)');
      return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const expectedApiKey = (EVOLUTION_API_KEY.value && EVOLUTION_API_KEY.value()) || process.env.EVOLUTION_API_KEY;
    const providedApiKey = req.headers['x-api-key'] || req.headers['apikey'] || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null);

    if (!expectedApiKey) {
      return res.status(503).json({ error: 'Autenticação do webhook não configurada.' });
    }
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      console.warn('[evolutionWhatsAppWebhook] Tentativa de requisição não autorizada rejeitada.');
      res.status(401).json({ error: 'Unauthorized webhook request' });
      return;
    }

    try {
      const rawLength = Buffer.isBuffer(req.rawBody)
        ? req.rawBody.length
        : Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');
      if (rawLength > MAX_WEBHOOK_BYTES) {
        return res.status(413).json({ error: 'Payload do webhook excede o limite permitido.' });
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
            if (String(messageText).length > 4096) {
              return res.status(200).json({ received: true, ignored: 'message_too_large' });
            }
            const nowIso = new Date().toISOString();

            const scopedChat = await getFirestore().collection('whatsapp_chats').doc(cleanPhone).get();
            const chatData = scopedChat.exists ? scopedChat.data() : {};
            const chatOwner = chatData.userId || null;
            // Instância compartilhada: contatos sem vínculo permanecem administrativos.
            const customerName = chatData.customerName || cleanPhone;
            const customerId = chatData.customerId || null;

            const msgDocId = key?.id ? `wa_${key.id}` : null;
            if (msgDocId) {
              const msgRef = getFirestore().collection('whatsapp_messages').doc(msgDocId);
              await persistIncomingMessage({
                db: getFirestore(),
                messageRef: msgRef,
                chatRef: getFirestore().collection('whatsapp_chats').doc(cleanPhone),
                message: {
                  userId: chatOwner,
                  chatId: cleanPhone,
                  phone: cleanPhone,
                  customerName,
                  customerId,
                  sender: fromMe ? 'me' : 'customer',
                  text: messageText,
                  status: fromMe ? 'sent' : 'received',
                  timestamp: nowIso,
                  evolutionMessageId: key.id,
                },
                increment: FieldValue.increment,
                serverTimestamp: FieldValue.serverTimestamp,
              });
            } else {
              console.warn('[evolutionWhatsAppWebhook] Evento sem message key.id ignorado.');
              return res.status(200).json({ received: true, ignored: 'missing_message_id' });
            }
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[evolutionWhatsAppWebhook] Erro ao processar webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }, () => moduleInitializationMs)
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { evolutionWhatsAppWebhook };
