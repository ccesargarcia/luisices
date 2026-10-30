/** Recebimento e validação de eventos do Resend. */
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onRequest } = require('../common/sentryFunctions');
const { RESEND_API_KEY, RESEND_WEBHOOK_SECRET, ORIGIN_SECRET } = require('../common/secrets');
const { getResend } = require('../common/helpers');
const { validateOriginSecret, getOriginSecretValue } = require('../originProtection');
const { evaluateSpam } = require('./spamFilter');
const { isValidSvixSignature } = require('./webhookSecurity');

const MAX_WEBHOOK_BYTES = 1024 * 1024;

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
        const rawContent = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
        const signatureValid = isValidSvixSignature({
          secret: webhookSecret,
          svixId,
          svixTimestamp,
          rawContent,
          signature: svixSignature,
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

      webhookClaimRef = getFirestore().collection('processedEmailWebhooks').doc(String(svixId));
      await getFirestore().runTransaction(async (transaction) => {
        webhookClaimed = false;
        const existing = await transaction.get(webhookClaimRef);
        if (existing.exists) return;
        transaction.create(webhookClaimRef, {
          emailId: String(emailId),
          eventType: event.type,
          createdAt: FieldValue.serverTimestamp(),
        });
        webhookClaimed = true;
      });
      if (!webhookClaimed) {
        return res.status(200).json({ status: 'duplicate', id: emailId });
      }

      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      const isDev = projectId === 'luisices-dev';

      const initialRecipients = [
        ...(Array.isArray(eventData.to) ? eventData.to : [eventData.to]),
        ...(Array.isArray(eventData.cc) ? eventData.cc : [eventData.cc]),
        ...(Array.isArray(eventData.bcc) ? eventData.bcc : [eventData.bcc]),
      ].filter(Boolean);

      const parseEmailDomain = (r) => {
        if (typeof r !== 'string') return '';
        const match = r.match(/<([^>]+)>/) || [null, r];
        const cleanEmail = (match[1] || r).trim().toLowerCase();
        return cleanEmail.split('@')[1] || '';
      };

      const recipientDomains = initialRecipients.map(parseEmailDomain).filter(Boolean);
      const hasDevRecipient = recipientDomains.some((d) => d === 'dev.luisices.com.br' || d.endsWith('.dev.luisices.com.br'));
      const hasProdRecipient = recipientDomains.some((d) => (d === 'luisices.com.br' || d.endsWith('.luisices.com.br')) && !(d === 'dev.luisices.com.br' || d.endsWith('.dev.luisices.com.br')));

      // Redirecionamento inteligente entre ambientes quando o Resend possui apenas um webhook cadastrado:
      const forwardedFrom = req.headers['x-forwarded-from'];
      const dynamicOriginToken = getOriginSecretValue();

      if (!forwardedFrom) {
        if (!isDev && hasDevRecipient && !hasProdRecipient) {
          // Chegou em PROD, mas é um e-mail de DEV -> Encaminhar para a API de DEV
          try {
            console.log('[resendReceivingWebhook] Encaminhando webhook de e-mail de DEV para api.dev.luisices.com.br...');
            const forwardHeaders = {
              'content-type': 'application/json',
              'x-forwarded-from': 'prod',
            };
            if (dynamicOriginToken) {
              forwardHeaders['x-origin-secret'] = dynamicOriginToken;
              forwardHeaders['x-cf-origin-token'] = dynamicOriginToken;
            }
            if (rawSvixId) forwardHeaders['svix-id'] = svixId;
            if (rawSvixTimestamp) forwardHeaders['svix-timestamp'] = svixTimestamp;
            if (rawSvixSignature) forwardHeaders['svix-signature'] = svixSignature;

            const forwardResp = await fetch('https://api.dev.luisices.com.br/resendReceivingWebhook', {
              method: 'POST',
              headers: forwardHeaders,
              body: req.rawBody ? req.rawBody : JSON.stringify(req.body),
            });
            const forwardJson = await forwardResp.json().catch(() => ({}));
            console.log('[resendReceivingWebhook] Encaminhado para DEV com resposta:', forwardResp.status, forwardJson);
            return res.status(forwardResp.status).json(forwardJson);
          } catch (fwdErr) {
            console.error('[resendReceivingWebhook] Falha ao encaminhar para DEV:', fwdErr);
          }
        } else if (isDev && hasProdRecipient && !hasDevRecipient) {
          // Chegou em DEV, mas é um e-mail de PROD -> Encaminhar para a API de PROD
          try {
            console.log('[resendReceivingWebhook] Encaminhando webhook de e-mail de PROD para api.luisices.com.br...');
            const forwardHeaders = {
              'content-type': 'application/json',
              'x-forwarded-from': 'dev',
            };
            if (dynamicOriginToken) {
              forwardHeaders['x-origin-secret'] = dynamicOriginToken;
              forwardHeaders['x-cf-origin-token'] = dynamicOriginToken;
            }
            if (rawSvixId) forwardHeaders['svix-id'] = svixId;
            if (rawSvixTimestamp) forwardHeaders['svix-timestamp'] = svixTimestamp;
            if (rawSvixSignature) forwardHeaders['svix-signature'] = svixSignature;

            const forwardResp = await fetch('https://api.luisices.com.br/resendReceivingWebhook', {
              method: 'POST',
              headers: forwardHeaders,
              body: req.rawBody ? req.rawBody : JSON.stringify(req.body),
            });
            const forwardJson = await forwardResp.json().catch(() => ({}));
            console.log('[resendReceivingWebhook] Encaminhado para PROD com resposta:', forwardResp.status, forwardJson);
            return res.status(forwardResp.status).json(forwardJson);
          } catch (fwdErr) {
            console.error('[resendReceivingWebhook] Falha ao encaminhar para PROD:', fwdErr);
          }
        }
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

          // Isolamento rigoroso: DEV só processa dev.luisices.com.br e PROD só processa luisices.com.br
          const isDevDomain = domain === 'dev.luisices.com.br' || domain.endsWith('.dev.luisices.com.br');
          const isProdDomain = (domain === 'luisices.com.br' || domain.endsWith('.luisices.com.br')) && !isDevDomain;

          const isTargetDomain = isDev ? isDevDomain : isProdDomain;
          return isTargetDomain && allowedMailboxPrefixes.includes(baseMailbox);
        });
      };

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
        createdAt: FieldValue.serverTimestamp(),
      };

      await getFirestore().collection('receivedEmails').doc(emailId).set(emailDoc, { merge: true });
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

module.exports = { resendReceivingWebhook };
