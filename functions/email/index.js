/**
 * Módulo de E-mail (Resend API e Webhook de Recebimento).
 */

const functions = require('firebase-functions');
const { onCall, onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { RESEND_API_KEY, RESEND_WEBHOOK_SECRET, ORIGIN_SECRET } = require('../common/secrets');
const { customEmailLimiter } = require('../common/rateLimiters');
const { getResend, isAdminRequest } = require('../common/helpers');
const { validateOriginSecret } = require('../originProtection');

/**
 * Cloud Function para envio de e-mails via Resend pela plataforma Luisices.
 * Salva o histórico de envios na coleção 'sentEmails'.
 */
const sendCustomEmail = onCall(
  { cors: true, maxInstances: 5, secrets: [RESEND_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    // Validação de permissões: admin ou funcionário com permissão de envio (emails.create === true ou emails === true)
    const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
    const profileData = profile.exists ? profile.data() : null;
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

    // Rate Limiting: proteção contra abusos, loops e exaustão de cota
    try {
      await customEmailLimiter.consume(request.auth.uid);
    } catch {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Limite de envio de e-mails atingido (máximo de 50 disparos por hora). Tente novamente mais tarde.'
      );
    }

    const { to, subject, html, text, from, replyTo, cc, bcc } = request.data || {};

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of recipientList) {
      if (!emailRegex.test(email)) {
        throw new functions.https.HttpsError('invalid-argument', `Endereço de e-mail inválido: "${email}"`);
      }
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Assunto é obrigatório.');
    }

    if (subject.trim().length > 200) {
      throw new functions.https.HttpsError('invalid-argument', 'O assunto do e-mail não pode ultrapassar 200 caracteres.');
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
    if (from && from.trim()) {
      const trimmedFrom = from.trim();
      const domainMatch = trimmedFrom.match(/@([a-zA-Z0-9.-]+)>?$/);
      const domain = domainMatch ? domainMatch[1].toLowerCase() : '';
      if (domain === 'luisices.com.br' || domain === 'dev.luisices.com.br' || domain.endsWith('.luisices.com.br')) {
        senderEmail = trimmedFrom;
      } else {
        console.warn(`[sendCustomEmail] Remetente com domínio não autorizado (${domain}). Usando padrão: ${defaultSender}`);
        senderEmail = defaultSender;
      }
    }

    try {
      const payload = {
        from: senderEmail,
        to: recipientList,
        subject: subject.trim(),
      };

      if (html) payload.html = html;
      if (text) payload.text = text;
      if (replyTo) payload.reply_to = replyTo.trim();
      if (cc && Array.isArray(cc) && cc.length > 0) {
        payload.cc = cc.map((c) => String(c).trim()).filter(Boolean);
      }
      if (bcc && Array.isArray(bcc) && bcc.length > 0) {
        payload.bcc = bcc.map((b) => String(b).trim()).filter(Boolean);
      }

      console.log(`[sendCustomEmail] Enviando e-mail para: ${recipientList.join(', ')} - Assunto: ${subject}`);
      const { data: resendData, error: resendError } = await resend.emails.send(payload);

      if (resendError) {
        console.error('[sendCustomEmail] Erro retornado pela API Resend:', JSON.stringify(resendError));
        throw new functions.https.HttpsError(
          'internal',
          resendError.message || 'Falha ao disparar o e-mail via Resend.'
        );
      }

      const emailRecord = {
        resendId: resendData?.id || null,
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
        sentAt: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await admin.firestore().collection('sentEmails').add(emailRecord);

      return {
        success: true,
        emailId: resendData?.id,
        id: docRef.id,
      };
    } catch (error) {
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
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const profile = await admin.firestore().doc(`userProfiles/${request.auth.uid}`).get();
    const profileData = profile.exists ? profile.data() : null;
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
          .get(),
        admin.firestore().collection('sentEmails')
          .where('sentAt', '>=', startOfMonthUtc.toISOString())
          .get(),
      ]);
      firestoreTodayCount = todaySnap.size;
      firestoreMonthCount = monthSnap.size;
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

    try {
      const webhookSecret = RESEND_WEBHOOK_SECRET.value() || process.env.RESEND_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('[resendReceivingWebhook] ERRO: RESEND_WEBHOOK_SECRET não configurado no Cloud Functions Secrets.');
        return res.status(500).json({ error: 'Configuração de segurança do webhook pendente no servidor' });
      }
      const svixId = req.headers['svix-id'];
      const svixTimestamp = req.headers['svix-timestamp'];
      const svixSignature = req.headers['svix-signature'];

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

      const event = req.body;
      console.log('[resendReceivingWebhook] Recebido evento:', event?.type);

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

          const isLuisicesDomain =
            domain === 'luisices.com.br' ||
            domain === 'dev.luisices.com.br' ||
            domain.endsWith('.luisices.com.br');

          return isLuisicesDomain && allowedMailboxPrefixes.includes(mailbox);
        });
      };

      const initialRecipients = Array.isArray(eventData.to) ? eventData.to : [eventData.to].filter(Boolean);
      if (initialRecipients.length > 0 && !checkAllowedRecipient(initialRecipients)) {
        console.log(`[resendReceivingWebhook] E-mail para destinatário não autorizado ignorado e descartado: ${initialRecipients.join(', ')}`);
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

      const emailDoc = {
        resendId: emailId,
        from: fullEmail?.from || eventData.from || '',
        to: fullEmail?.to || (Array.isArray(eventData.to) ? eventData.to : [eventData.to].filter(Boolean)),
        cc: fullEmail?.cc || eventData.cc || [],
        bcc: fullEmail?.bcc || eventData.bcc || [],
        subject: fullEmail?.subject || eventData.subject || '(Sem assunto)',
        html: fullEmail?.html || '',
        text: fullEmail?.text || '',
        attachments: fullEmail?.attachments || eventData.attachments || [],
        raw: fullEmail?.raw || null,
        read: false,
        starred: false,
        archived: false,
        receivedAt: eventData.created_at || new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin.firestore().collection('receivedEmails').doc(emailId).set(emailDoc, { merge: true });
      console.log(`[resendReceivingWebhook] E-mail recebido salvo com sucesso: ${emailId}`);

      return res.status(200).json({ ok: true, id: emailId });
    } catch (error) {
      console.error('[resendReceivingWebhook] Falha ao processar webhook:', error);
      return res.status(500).json({ error: 'Erro interno ao processar webhook de recebimento' });
    }
  }
);

module.exports = {
  sendCustomEmail,
  getEmailUsage,
  resendReceivingWebhook,
};
