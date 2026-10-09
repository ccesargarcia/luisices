/**
 * Módulo de E-mail (Resend API e Webhook de Recebimento).
 */

const functions = require('firebase-functions');
const { onCall, onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { RESEND_API_KEY, RESEND_WEBHOOK_SECRET, ORIGIN_SECRET } = require('../common/secrets');
const { customEmailLimiter } = require('../common/rateLimiters');
const { getResend, isAdminRequest, assertActiveSession } = require('../common/helpers');
const { validateOriginSecret } = require('../originProtection');
const { prepareAttachments } = require('./attachments');
const { cleanupEmailDrafts } = require('./cleanup');
const { evaluateSpam } = require('./spamFilter');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CC_BCC = 20;
const MAX_HEADER_LENGTH = 320;
const MAX_WEBHOOK_BYTES = 1024 * 1024;

function normalizeEmailList(value, fieldName, max = MAX_CC_BCC) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} deve conter no máximo ${max} endereços.`);
  }
  return value.map((entry) => {
    if (typeof entry !== 'string' || entry.length > MAX_HEADER_LENGTH || /[\r\n\0,;]/.test(entry)) {
      throw new functions.https.HttpsError('invalid-argument', `${fieldName} contém um endereço inválido.`);
    }
    const email = entry.trim();
    if (!EMAIL_REGEX.test(email)) {
      throw new functions.https.HttpsError('invalid-argument', `${fieldName} contém um endereço inválido.`);
    }
    return email;
  });
}

/**
 * Cloud Function para envio de e-mails via Resend pela plataforma Luisices.
 * Salva o histórico de envios na coleção 'sentEmails'.
 * Garante idempotência estrita via coleção 'emailSendRequests' e cabeçalho X-Entity-Ref-ID.
 */
const sendCustomEmail = onCall(
  { cors: true, maxInstances: 5, secrets: [RESEND_API_KEY] },
  async (request) => {
    const { profile: profileData } = await assertActiveSession(request);
    
    // Validação de permissões: admin ou funcionário com permissão de envio (emails.create === true ou emails === true)
    const isActive = profileData?.active !== false;
    const isUserAdmin = profileData?.role === 'admin';
    const emailsPerm = profileData?.permissions?.emails;
    const canSend = isActive && (
      isUserAdmin ||
      emailsPerm === true ||
      (typeof emailsPerm === 'object' && emailsPerm !== null && Boolean(emailsPerm.create))
    );

    if (!canSend) {
      throw new functions.https.HttpsError('permission-denied', 'Você não possui permissão para disparar e-mails pelo sistema.');
    }

    const {
      to,
      subject,
      html,
      text,
      from,
      replyTo,
      cc,
      bcc,
      attachments,
      idempotencyKey,
    } = request.data || {};

    if (idempotencyKey != null) {
      if (typeof idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) {
        throw new functions.https.HttpsError('invalid-argument', 'Chave de idempotência inválida (deve conter 8 a 128 caracteres alfanuméricos, hífens ou underscores).');
      }
    }

    if (!to || (Array.isArray(to) && to.length === 0)) {
      throw new functions.https.HttpsError('invalid-argument', 'Pelo menos um destinatário é obrigatório.');
    }

    const recipientList = Array.isArray(to)
      ? to.map((e) => String(e).trim()).filter(Boolean)
      : [String(to).trim()];

    if (recipientList.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Pelo menos um destinatário válido é obrigatório.');
    }

    if (recipientList.length > 50) {
      throw new functions.https.HttpsError('invalid-argument', 'O número máximo de destinatários por envio é 50.');
    }

    for (const email of recipientList) {
      if (email.length > MAX_HEADER_LENGTH || /[\r\n\0,;]/.test(email) || !EMAIL_REGEX.test(email)) {
        throw new functions.https.HttpsError('invalid-argument', `Endereço de e-mail inválido: "${email}"`);
      }
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Assunto é obrigatório.');
    }

    if (subject.trim().length > 200) {
      throw new functions.https.HttpsError('invalid-argument', 'O assunto do e-mail não pode ultrapassar 200 caracteres.');
    }

    if ((html != null && typeof html !== 'string') || (text != null && typeof text !== 'string')) {
      throw new functions.https.HttpsError('invalid-argument', 'O conteúdo da mensagem deve ser texto.');
    }

    if (!html && !text) {
      throw new functions.https.HttpsError('invalid-argument', 'Conteúdo da mensagem (HTML ou texto) é obrigatório.');
    }

    const bodyLength = (html ? String(html).length : 0) + (text ? String(text).length : 0);
    if (bodyLength > 500 * 1024) {
      throw new functions.https.HttpsError('invalid-argument', 'O tamanho da mensagem excede o limite máximo permitido (500 KB).');
    }

    const resend = getResend(RESEND_API_KEY.value());
    if (!resend) {
      throw new functions.https.HttpsError('failed-precondition', 'Resend não configurado.');
    }

    const isDev = (process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT) === 'luisices-dev';
    const defaultSender = isDev
      ? 'Luisices Dev <contato@dev.luisices.com.br>'
      : 'Luisices <contato@luisices.com.br>';

    let senderEmail = defaultSender;
    if (from != null && (typeof from !== 'string' || from.length > MAX_HEADER_LENGTH || /[\r\n\0]/.test(from))) {
      throw new functions.https.HttpsError('invalid-argument', 'Remetente inválido.');
    }
    if (typeof from === 'string' && from.trim()) {
      const trimmedFrom = from.trim();
      const match = trimmedFrom.match(/^(?:([^<>]+)\s+<)?([^\s<>@]+@[^\s<>@]+)>?$/);
      if (!match) {
        throw new functions.https.HttpsError('invalid-argument', 'Remetente inválido.');
      }
      const rawDomain = match[2].toLowerCase().split('@')[1] || '';
      if (rawDomain === 'luisices.com.br' || rawDomain === 'dev.luisices.com.br' || rawDomain.endsWith('.luisices.com.br')) {
        senderEmail = trimmedFrom;
      } else {
        console.warn(`[sendCustomEmail] Remetente com domínio não autorizado (${rawDomain}). Usando padrão: ${defaultSender}`);
        senderEmail = defaultSender;
      }
    }

    // ─── Controle de Idempotência Transacional ──────────────────────────────────
    let idempotencyRef = null;
    let ownsIdempotency = false;
    if (idempotencyKey) {
      idempotencyRef = admin.firestore().collection('emailSendRequests').doc(`${request.auth.uid}_${idempotencyKey}`);
      let existingRequest = null;
      await admin.firestore().runTransaction(async (transaction) => {
        const snap = await transaction.get(idempotencyRef);
        existingRequest = snap.data() || null;
        if (existingRequest?.status === 'completed') {
          return;
        }
        if (existingRequest?.status === 'processing') {
          const createdAtMs = existingRequest.createdAt?.toMillis?.() || 0;
          if (Date.now() - createdAtMs < 60000) {
            return;
          }
          // Request estagnado há mais de 60s, permite recuperação
          transaction.update(idempotencyRef, {
            status: 'processing',
            retryAt: admin.firestore.FieldValue.serverTimestamp(),
            error: admin.firestore.FieldValue.delete(),
          });
          ownsIdempotency = true;
          existingRequest = null;
          return;
        }
        transaction.set(idempotencyRef, {
          status: 'processing',
          uid: request.auth.uid,
          subject: subject.trim().slice(0, 100),
          recipientCount: recipientList.length,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        ownsIdempotency = true;
        existingRequest = null;
      });

      if (existingRequest?.status === 'completed') {
        return {
          success: true,
          emailId: existingRequest.emailId,
          id: existingRequest.sentDocId,
          duplicate: true,
        };
      }
      if (existingRequest?.status === 'processing') {
        throw new functions.https.HttpsError('aborted', 'Este envio de e-mail já está sendo processado.');
      }
    }

    // Rate Limiting: proteção contra abusos, loops e exaustão de cota
    try {
      await customEmailLimiter.consume(request.auth.uid);
    } catch {
      if (ownsIdempotency && idempotencyRef) {
        await idempotencyRef.delete().catch(() => {});
      }
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Limite de envio de e-mails atingido (máximo de 50 disparos por hora). Tente novamente mais tarde.'
      );
    }

    try {
      let preparedAttachments;
      try {
        preparedAttachments = await prepareAttachments({
          attachments, bucket: admin.storage().bucket(), db: admin.firestore(),
          uid: request.auth.uid, profile: profileData,
          projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT,
        });
      } catch (error) {
        throw new functions.https.HttpsError('invalid-argument', error.message);
      }
      const payload = {
        from: senderEmail,
        to: recipientList,
        subject: subject.trim(),
      };

      if (idempotencyKey) {
        payload.headers = {
          'X-Entity-Ref-ID': idempotencyKey,
        };
      }

      if (preparedAttachments.length) {
        payload.attachments = preparedAttachments.map(({ filename, content }) => ({ filename, content }));
      }

      if (html) payload.html = html;
      if (text) payload.text = text;
      if (replyTo != null) {
        if (typeof replyTo !== 'string' || replyTo.length > MAX_HEADER_LENGTH || /[\r\n\0,;]/.test(replyTo)) {
          throw new functions.https.HttpsError('invalid-argument', 'Responder para inválido.');
        }
        const normalizedReplyTo = replyTo.trim();
        const replyToMatch = normalizedReplyTo.match(/^(?:([^<>]+)\s+<)?([^\s<>@]+@[^\s<>@]+)>?$/);
        if (!replyToMatch || !EMAIL_REGEX.test(replyToMatch[2])) {
          throw new functions.https.HttpsError('invalid-argument', 'Responder para inválido.');
        }
        payload.reply_to = replyToMatch[2];
      }
      const normalizedCc = normalizeEmailList(cc, 'Cópia');
      const normalizedBcc = normalizeEmailList(bcc, 'Cópia oculta');
      if (normalizedCc.length) payload.cc = normalizedCc;
      if (normalizedBcc.length) payload.bcc = normalizedBcc;

      console.log(`[sendCustomEmail] Enviando e-mail: uid=${request.auth.uid}, recipients=${recipientList.length}, attachments=${preparedAttachments.length}`);
      const { data: resendData, error: resendError } = await resend.emails.send(payload);

      if (resendError) {
        console.error('[sendCustomEmail] Resend rejeitou o envio:', {
          name: resendError.name || 'ResendError',
          statusCode: resendError.statusCode || null,
        });
        throw new functions.https.HttpsError(
          'internal',
          resendError.message || 'Falha ao disparar o e-mail via Resend.'
        );
      }

      const emailRecord = {
        resendId: resendData?.id || null,
        idempotencyKey: idempotencyKey || null,
        from: senderEmail,
        to: recipientList,
        cc: payload.cc || [],
        bcc: payload.bcc || [],
        subject: subject.trim(),
        html: html || '',
        text: text || '',
        status: 'sent',
        senderUid: request.auth.uid,
        senderEmail: request.auth.token.email || '',
        attachments: preparedAttachments.map(({ filename }) => ({ filename })),
        sentAt: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore().collection('sentEmails').add(emailRecord);

      // Marca idempotência como concluída com sucesso
      if (ownsIdempotency && idempotencyRef) {
        await idempotencyRef.update({
          status: 'completed',
          emailId: resendData?.id || null,
          sentDocId: docRef.id,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch((err) => console.warn('[sendCustomEmail] Falha ao atualizar idempotência:', err));
      }

      // IMPORTANTE: Apenas rascunhos temporários de e-mail devem ser removidos;
      // arquivos pertencentes a pedidos definitivos NUNCA devem ser deletados!
      const isTemporaryDraft = (filePath) => typeof filePath === 'string' && /^users\/[^/]+\/orders\/email_draft\//.test(filePath);
      await Promise.allSettled(
        preparedAttachments
          .filter(({ path }) => isTemporaryDraft(path))
          .map(({ path }) => admin.storage().bucket().file(path).delete({ ignoreNotFound: true }))
      );

      return {
        success: true,
        emailId: resendData?.id,
        id: docRef.id,
      };
    } catch (error) {
      if (ownsIdempotency && idempotencyRef) {
        await idempotencyRef.set({
          status: 'failed',
          error: error.message || 'Erro ao enviar e-mail.',
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }
      console.error('[sendCustomEmail] Exceção:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', error.message || 'Erro ao enviar e-mail.');
    }
  }
);

/**
 * Cloud Function para consultar a cota / limite de envio de e-mails via Resend API (ou fallback via Firestore).
 */
const getEmailUsage = onCall(
  { cors: true, maxInstances: 5, secrets: [RESEND_API_KEY] },
  async (request) => {
    const { profile: profileData } = await assertActiveSession(request);
    
    const isActive = profileData?.active !== false;
    const isUserAdmin = profileData?.role === 'admin';
    const emailsPerm = profileData?.permissions?.emails;
    const hasEmailPerm = isActive && (
      isUserAdmin ||
      emailsPerm === true ||
      (typeof emailsPerm === 'object' && emailsPerm !== null && Boolean(emailsPerm.view || emailsPerm.create))
    );
    if (!hasEmailPerm) {
      throw new functions.https.HttpsError('permission-denied', 'Sem permissão para consultar a cota de e-mails.');
    }

    // 1. Sempre computar contagem real do Firestore para garantir feedback em tempo real
    const now = new Date();
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

    let firestoreTodayCount = 0;
    let firestoreMonthCount = 0;
    try {
      const [todaySnap, monthSnap] = await Promise.all([
        admin.firestore().collection('sentEmails')
          .where('sentAt', '>=', startOfTodayUtc.toISOString())
          .count()
          .get(),
        admin.firestore().collection('sentEmails')
          .where('sentAt', '>=', startOfMonthUtc.toISOString())
          .count()
          .get(),
      ]);
      firestoreTodayCount = todaySnap.data().count;
      firestoreMonthCount = monthSnap.data().count;
    } catch (fsErr) {
      console.warn('[getEmailUsage] Erro ao consultar sentEmails no Firestore:', fsErr);
    }

    // 2. Tentar consultar métricas oficiais do Resend
    let resendDailySent = 0;
    let resendMonthlySent = 0;
    let source = 'firestore_fallback';

    const apiKey = RESEND_API_KEY.value();
    if (apiKey) {
      try {
        const startOfTodayIso = `${now.toISOString().split('T')[0]}T00:00:00Z`;
        const startOfMonthIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;

        const [dailyRes, monthlyRes] = await Promise.all([
          fetch(`https://api.resend.com/emails/metrics?start_date=${startOfTodayIso}&metrics=sent,delivered`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Luisices-Functions/1.0',
            },
          }),
          fetch(`https://api.resend.com/emails/metrics?start_date=${startOfMonthIso}&metrics=sent,delivered`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Luisices-Functions/1.0',
            },
          }),
        ]);

        if (dailyRes.ok && monthlyRes.ok) {
          const dailyData = await dailyRes.json();
          const monthlyData = await monthlyRes.json();
          resendDailySent = Number(dailyData?.totals?.sent ?? 0);
          resendMonthlySent = Number(monthlyData?.totals?.sent ?? 0);
          source = 'resend_api';
          console.log(`[getEmailUsage] Resend metrics sucesso - Hoje: ${resendDailySent}, Mês: ${resendMonthlySent}`);
        } else {
          console.warn(`[getEmailUsage] Resend /emails/metrics status: daily=${dailyRes.status}, monthly=${monthlyRes.status}`);
        }
      } catch (err) {
        console.warn('[getEmailUsage] Erro ao consultar https://api.resend.com/emails/metrics:', err);
      }
    }

    const finalDailyUsed = Math.max(resendDailySent, firestoreTodayCount);
    const finalMonthlyUsed = Math.max(resendMonthlySent, firestoreMonthCount);

    const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const nextUtcMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

    return {
      success: true,
      source,
      daily: {
        used: finalDailyUsed,
        limit: 100,
        sent: finalDailyUsed,
        received: 0,
        resetsAt: nextUtcMidnight.toISOString(),
      },
      monthly: {
        used: finalMonthlyUsed,
        limit: 3000,
        sent: finalMonthlyUsed,
        received: 0,
        resetsAt: nextUtcMonth.toISOString(),
      },
    };
  }
);

/**
 * Webhook HTTP para recebimento de e-mails via Resend (email.received).
 * Armazena e-mails recebidos na coleção 'receivedEmails'.
 */
const resendReceivingWebhook = onRequest(
  { cors: true, secrets: [RESEND_API_KEY, RESEND_WEBHOOK_SECRET, ORIGIN_SECRET] },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, svix-id, svix-timestamp, svix-signature, x-origin-secret, x-cf-origin-token');
      return res.status(204).send('');
    }

    const originCheck = validateOriginSecret(req);
    if (!originCheck.allowed) {
      console.warn('[resendReceivingWebhook] Tentativa de acesso direto bloqueada (sem header da Cloudflare)');
      return res.status(originCheck.statusCode || 403).json({ error: originCheck.error });
    }

    if (req.method === 'GET') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ status: 'active', message: 'Luisices Resend Webhook ativo e operacional' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let webhookClaimRef = null;
    let webhookClaimed = false;
    try {
      const rawLength = Buffer.isBuffer(req.rawBody)
        ? req.rawBody.length
        : Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');
      if (rawLength > MAX_WEBHOOK_BYTES) {
        return res.status(413).json({ error: 'Payload do webhook excede o limite permitido' });
      }
      const webhookSecret = RESEND_WEBHOOK_SECRET.value() || process.env.RESEND_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('[resendReceivingWebhook] ERRO: RESEND_WEBHOOK_SECRET não configurado no Cloud Functions Secrets.');
        return res.status(500).json({ error: 'Configuração de segurança do webhook pendente no servidor' });
      }
      const rawSvixId = req.headers['svix-id'];
      const rawSvixTimestamp = req.headers['svix-timestamp'];
      const rawSvixSignature = req.headers['svix-signature'];

      const svixId = Array.isArray(rawSvixId) ? rawSvixId[0] : rawSvixId;
      const svixTimestamp = Array.isArray(rawSvixTimestamp) ? rawSvixTimestamp[0] : rawSvixTimestamp;
      const svixSignature = Array.isArray(rawSvixSignature) ? rawSvixSignature[0] : rawSvixSignature;

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('[resendReceivingWebhook] Cabeçalhos de assinatura Svix ausentes');
        return res.status(401).json({ error: 'Assinatura do webhook ausente' });
      }

      const now = Math.floor(Date.now() / 1000);
      const timestampNum = parseInt(String(svixTimestamp), 10);
      if (isNaN(timestampNum) || Math.abs(now - timestampNum) > 300) {
        console.warn('[resendReceivingWebhook] Timestamp fora da tolerância de 5 minutos:', timestampNum);
        return res.status(401).json({ error: 'Timestamp do webhook expirado ou inválido' });
      }

      try {
        const secretBytes = webhookSecret.startsWith('whsec_')
          ? Buffer.from(webhookSecret.slice(6), 'base64')
          : Buffer.from(webhookSecret);
        const rawContent = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
        const signedContent = `${svixId}.${svixTimestamp}.${rawContent}`;
        const computedSignature = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

        const providedSignatures = String(svixSignature)
          .split(' ')
          .map((s) => s.split(',')[1])
          .filter(Boolean);

        const signatureValid = providedSignatures.some((sig) => {
          try {
            const a = Buffer.from(sig, 'base64');
            const b = Buffer.from(computedSignature, 'base64');
            return a.length === b.length && crypto.timingSafeEqual(a, b);
          } catch {
            return false;
          }
        });

        if (!signatureValid) {
          console.warn('[resendReceivingWebhook] Assinatura Svix rejeitada');
          return res.status(401).json({ error: 'Assinatura Svix inválida' });
        }
      } catch (err) {
        console.error('[resendReceivingWebhook] Falha na validação criptográfica:', err);
        return res.status(401).json({ error: 'Falha na validação de assinatura' });
      }

      let event = req.body;
      if (typeof event === 'string') {
        try {
          event = JSON.parse(event);
        } catch {}
      } else if (Buffer.isBuffer(event)) {
        try {
          event = JSON.parse(event.toString('utf8'));
        } catch {}
      }
      console.log('[resendReceivingWebhook] Evento recebido:', event?.type);

      if (!event || event.type !== 'email.received') {
        console.log('[resendReceivingWebhook] Evento não é email.received, ignorado:', event?.type);
        return res.status(200).json({ status: 'ignored', type: event?.type });
      }

      const eventData = event.data || {};
      const emailId = eventData.email_id || eventData.id;

      if (!emailId) {
        console.warn('[resendReceivingWebhook] Nenhum email_id no payload:', eventData);
        return res.status(400).json({ error: 'Payload sem email_id' });
      }

      webhookClaimRef = admin.firestore().collection('processedEmailWebhooks').doc(String(svixId));
      await admin.firestore().runTransaction(async (transaction) => {
        webhookClaimed = false;
        const existing = await transaction.get(webhookClaimRef);
        if (existing.exists) return;
        transaction.create(webhookClaimRef, {
          emailId: String(emailId),
          eventType: event.type,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        webhookClaimed = true;
      });
      if (!webhookClaimed) {
        return res.status(200).json({ status: 'duplicate', id: emailId });
      }

      const allowedMailboxPrefixes = [
        'caio',
        'amanda',
        'suporte',
        'noreply',
        'contato',
        'atendimento',
      ];

      const checkAllowedRecipient = (recipients) => {
        if (!Array.isArray(recipients) || recipients.length === 0) return true;
        return recipients.some((r) => {
          if (typeof r !== 'string') return false;
          const match = r.match(/<([^>]+)>/) || [null, r];
          const cleanEmail = (match[1] || r).trim().toLowerCase();
          const [mailbox, domain] = cleanEmail.split('@');
          if (!mailbox || !domain) return false;

          // Suporte a subendereçamento (plus-addressing / tags: contato+orcamento@luisices.com.br)
          const baseMailbox = mailbox.split('+')[0];

          const isLuisicesDomain =
            domain === 'luisices.com.br' ||
            domain === 'dev.luisices.com.br' ||
            domain.endsWith('.luisices.com.br');

          return isLuisicesDomain && allowedMailboxPrefixes.includes(baseMailbox);
        });
      };

      const initialRecipients = [
        ...(Array.isArray(eventData.to) ? eventData.to : [eventData.to]),
        ...(Array.isArray(eventData.cc) ? eventData.cc : [eventData.cc]),
        ...(Array.isArray(eventData.bcc) ? eventData.bcc : [eventData.bcc]),
      ].filter(Boolean);

      if (initialRecipients.length > 0 && !checkAllowedRecipient(initialRecipients)) {
        console.log(`[resendReceivingWebhook] Evento descartado: destinatario_nao_autorizado, count=${initialRecipients.length}`);
        return res.status(200).json({
          status: 'discarded',
          reason: 'recipient_not_allowed',
          recipients: initialRecipients,
        });
      }

      let fullEmail = null;
      const apiKey = RESEND_API_KEY.value();

      if (apiKey) {
        try {
          const resend = getResend(apiKey);
          if (resend?.emails?.receiving && typeof resend.emails.receiving.get === 'function') {
            const resendResult = await resend.emails.receiving.get(emailId);
            fullEmail = resendResult?.data || null;
          } else {
            const resp = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            });
            if (resp.ok) {
              fullEmail = await resp.json();
            } else {
              console.warn('[resendReceivingWebhook] API Resend retornou status:', resp.status);
            }
          }
        } catch (fetchErr) {
          console.warn('[resendReceivingWebhook] Erro ao recuperar corpo completo do e-mail:', fetchErr);
        }
      }

      if (apiKey && !fullEmail) {
        console.warn('[resendReceivingWebhook] Aviso: Não foi possível obter corpo completo via API Resend. Salvando com metadados do payload:', emailId);
      }

      // Avaliação heurística e por regras antispam
      const emailFrom = fullEmail?.from || eventData.from || '';
      const emailSubject = fullEmail?.subject || eventData.subject || '';
      const emailText = fullEmail?.text || '';
      const emailHtml = fullEmail?.html || '';

      const spamResult = evaluateSpam({
        from: emailFrom,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });

      const emailDoc = {
        resendId: emailId,
        from: emailFrom,
        to: fullEmail?.to || (Array.isArray(eventData.to) ? eventData.to : [eventData.to].filter(Boolean)),
        cc: fullEmail?.cc || eventData.cc || [],
        bcc: fullEmail?.bcc || eventData.bcc || [],
        subject: emailSubject || '(Sem assunto)',
        html: emailHtml,
        text: emailText,
        attachments: fullEmail?.attachments || eventData.attachments || [],
        raw: fullEmail?.raw || null,
        read: false,
        starred: false,
        archived: false,
        spam: spamResult.isSpam,
        spamScore: spamResult.score,
        spamReasons: spamResult.reasons,
        receivedAt: eventData.created_at || new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin.firestore().collection('receivedEmails').doc(emailId).set(emailDoc, { merge: true });
      console.log(`[resendReceivingWebhook] E-mail recebido salvo com sucesso: ${emailId}`);

      return res.status(200).json({ ok: true, id: emailId });
    } catch (error) {
      if (webhookClaimed && webhookClaimRef) {
        await webhookClaimRef.delete().catch(() => {});
      }
      console.error('[resendReceivingWebhook] Falha ao processar webhook:', error);
      return res.status(500).json({ error: 'Erro interno ao processar webhook de recebimento' });
    }
  }
);

module.exports = {
  sendCustomEmail,
  getEmailUsage,
  resendReceivingWebhook,
  cleanupEmailDrafts,
};
