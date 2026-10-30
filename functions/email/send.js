/** Envio de e-mails via Resend. Isolado do webhook e da limpeza agendada. */
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const crypto = require('crypto');
const { RESEND_API_KEY } = require('../common/secrets');
const { customEmailLimiter } = require('../common/rateLimiters');
const { getResend, assertActiveSession } = require('../common/helpers');
const { prepareAttachments } = require('./attachments');
const { fingerprint, acquireSend, markProviderAttempt, completeSend, releaseSend } = require('./sendIdempotency');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CC_BCC = 20;
const MAX_HEADER_LENGTH = 320;

function normalizeEmailList(value, fieldName, max = MAX_CC_BCC) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) {
    throw new HttpsError('invalid-argument', `${fieldName} deve conter no máximo ${max} endereços.`);
  }
  return value.map((entry) => {
    if (typeof entry !== 'string' || entry.length > MAX_HEADER_LENGTH || /[\r\n\0,;]/.test(entry)) {
      throw new HttpsError('invalid-argument', `${fieldName} contém um endereço inválido.`);
    }
    const email = entry.trim();
    if (!EMAIL_REGEX.test(email)) {
      throw new HttpsError('invalid-argument', `${fieldName} contém um endereço inválido.`);
    }
    return email;
  });
}

/**
 * Cloud Function para envio de e-mails via Resend pela plataforma Luisices.
 * Salva o histórico de envios na coleção 'sentEmails'.
 * Deduplica pelo registro local e pela chave de idempotência da API Resend.
 * A recuperação local de operações interrompidas exige validação adicional.
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
      throw new HttpsError('permission-denied', 'Você não possui permissão para disparar e-mails pelo sistema.');
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
        throw new HttpsError('invalid-argument', 'Chave de idempotência inválida (deve conter 8 a 128 caracteres alfanuméricos, hífens ou underscores).');
      }
    }

    if (!to || (Array.isArray(to) && to.length === 0)) {
      throw new HttpsError('invalid-argument', 'Pelo menos um destinatário é obrigatório.');
    }

    const recipientList = Array.isArray(to)
      ? to.map((e) => String(e).trim()).filter(Boolean)
      : [String(to).trim()];

    if (recipientList.length === 0) {
      throw new HttpsError('invalid-argument', 'Pelo menos um destinatário válido é obrigatório.');
    }

    if (recipientList.length > 50) {
      throw new HttpsError('invalid-argument', 'O número máximo de destinatários por envio é 50.');
    }

    for (const email of recipientList) {
      if (email.length > MAX_HEADER_LENGTH || /[\r\n\0,;]/.test(email) || !EMAIL_REGEX.test(email)) {
        throw new HttpsError('invalid-argument', `Endereço de e-mail inválido: "${email}"`);
      }
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      throw new HttpsError('invalid-argument', 'Assunto é obrigatório.');
    }

    if (subject.trim().length > 200) {
      throw new HttpsError('invalid-argument', 'O assunto do e-mail não pode ultrapassar 200 caracteres.');
    }

    if ((html != null && typeof html !== 'string') || (text != null && typeof text !== 'string')) {
      throw new HttpsError('invalid-argument', 'O conteúdo da mensagem deve ser texto.');
    }

    if (!html && !text) {
      throw new HttpsError('invalid-argument', 'Conteúdo da mensagem (HTML ou texto) é obrigatório.');
    }

    const bodyLength = (html ? String(html).length : 0) + (text ? String(text).length : 0);
    if (bodyLength > 500 * 1024) {
      throw new HttpsError('invalid-argument', 'O tamanho da mensagem excede o limite máximo permitido (500 KB).');
    }

    const resend = getResend(RESEND_API_KEY.value());
    if (!resend) {
      throw new HttpsError('failed-precondition', 'Resend não configurado.');
    }

    const isDev = (process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT) === 'luisices-dev';
    const defaultSender = isDev
      ? 'Luisices Dev <contato@dev.luisices.com.br>'
      : 'Luisices <contato@luisices.com.br>';

    let senderEmail = defaultSender;
    if (from != null && (typeof from !== 'string' || from.length > MAX_HEADER_LENGTH || /[\r\n\0]/.test(from))) {
      throw new HttpsError('invalid-argument', 'Remetente inválido.');
    }
    if (typeof from === 'string' && from.trim()) {
      const trimmedFrom = from.trim();
      const match = trimmedFrom.match(/^(?:([^<>]+)\s+<)?([^\s<>@]+@[^\s<>@]+)>?$/);
      if (!match) {
        throw new HttpsError('invalid-argument', 'Remetente inválido.');
      }
      const rawDomain = match[2].toLowerCase().split('@')[1] || '';
      if (rawDomain === 'luisices.com.br' || rawDomain === 'dev.luisices.com.br' || rawDomain.endsWith('.luisices.com.br')) {
        senderEmail = trimmedFrom;
      } else {
        console.warn(`[sendCustomEmail] Remetente com domínio não autorizado (${rawDomain}). Usando padrão: ${defaultSender}`);
        senderEmail = defaultSender;
      }
    }

    let sendContext = null;
    if (idempotencyKey) {
      const db = getFirestore();
      const ref = db.collection('emailSendRequests').doc(`${request.auth.uid}_${idempotencyKey}`);
      const hash = fingerprint({
        from: senderEmail, to: recipientList, subject: subject.trim(),
        html: html || '', text: text || '', replyTo: replyTo || '',
        cc: normalizeEmailList(cc, 'Cópia'), bcc: normalizeEmailList(bcc, 'Cópia oculta'),
        attachments: attachments || [],
      });
      const decision = await acquireSend({ db, ref, hash, uid: request.auth.uid });
      if (decision.completed) {
        return { success: true, emailId: decision.completed.emailId, id: decision.completed.sentDocId, duplicate: true };
      }
      sendContext = { db, ref, owner: decision.owner };
    }

    // Rate Limiting: proteção contra abusos, loops e exaustão de cota
    try {
      await customEmailLimiter.consume(request.auth.uid);
    } catch {
      if (sendContext) {
        await releaseSend(sendContext, FieldValue.serverTimestamp()).catch(() => {});
      }
      throw new HttpsError(
        'resource-exhausted',
        'Limite de envio de e-mails atingido (máximo de 50 disparos por hora). Tente novamente mais tarde.'
      );
    }

    try {
      let preparedAttachments;
      try {
        preparedAttachments = await prepareAttachments({
          attachments, bucket: getStorage().bucket(), db: getFirestore(),
          uid: request.auth.uid, profile: profileData,
          projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT,
        });
      } catch (error) {
        throw new HttpsError('invalid-argument', error.message);
      }
      const payload = {
        from: senderEmail,
        to: recipientList,
        subject: subject.trim(),
      };

      if (preparedAttachments.length) {
        payload.attachments = preparedAttachments.map(({ filename, content, contentType }) => ({
          filename,
          content,
          contentType,
        }));
      }

      if (html) payload.html = html;
      if (text) payload.text = text;
      if (replyTo != null) {
        if (typeof replyTo !== 'string' || replyTo.length > MAX_HEADER_LENGTH || /[\r\n\0,;]/.test(replyTo)) {
          throw new HttpsError('invalid-argument', 'Responder para inválido.');
        }
        const normalizedReplyTo = replyTo.trim();
        const replyToMatch = normalizedReplyTo.match(/^(?:([^<>]+)\s+<)?([^\s<>@]+@[^\s<>@]+)>?$/);
        if (!replyToMatch || !EMAIL_REGEX.test(replyToMatch[2])) {
          throw new HttpsError('invalid-argument', 'Responder para inválido.');
        }
        payload.reply_to = replyToMatch[2];
      }
      const normalizedCc = normalizeEmailList(cc, 'Cópia');
      const normalizedBcc = normalizeEmailList(bcc, 'Cópia oculta');
      if (normalizedCc.length) payload.cc = normalizedCc;
      if (normalizedBcc.length) payload.bcc = normalizedBcc;

      console.log(`[sendCustomEmail] Enviando e-mail: uid=${request.auth.uid}, recipients=${recipientList.length}, attachments=${preparedAttachments.length}`);
      if (sendContext) await markProviderAttempt(sendContext, fingerprint(payload));
      const { data: resendData, error: resendError } = await resend.emails.send(payload, idempotencyKey
        ? { idempotencyKey: fingerprint({ uid: request.auth.uid, key: idempotencyKey }) }
        : undefined);

      if (resendError) {
        console.error('[sendCustomEmail] Resend rejeitou o envio:', {
          name: resendError.name || 'ResendError',
          statusCode: resendError.statusCode || null,
        });
        throw new HttpsError(
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
        attachments: preparedAttachments.map(({ filename, contentType }) => ({ filename, contentType })),
        sentAt: new Date().toISOString(),
        createdAt: FieldValue.serverTimestamp(),
      };

      const sentCollection = getFirestore().collection('sentEmails');
      const docRef = sendContext
        ? sentCollection.doc(crypto.createHash('sha256').update(sendContext.ref.path).digest('hex'))
        : sentCollection.doc();
      if (sendContext) {
        await completeSend(sendContext, docRef, emailRecord, FieldValue.serverTimestamp());
      } else {
        await docRef.set(emailRecord);
      }

      // IMPORTANTE: Apenas rascunhos temporários de e-mail devem ser removidos;
      // arquivos pertencentes a pedidos definitivos NUNCA devem ser deletados!
      const isTemporaryDraft = (filePath) => typeof filePath === 'string' && /^users\/[^/]+\/orders\/email_draft\//.test(filePath);
      await Promise.allSettled(
        preparedAttachments
          .filter(({ path }) => isTemporaryDraft(path))
          .map(({ path }) => getStorage().bucket().file(path).delete({ ignoreNotFound: true }))
      );

      return {
        success: true,
        emailId: resendData?.id,
        id: docRef.id,
      };
    } catch (error) {
      if (sendContext) {
        await releaseSend(sendContext, FieldValue.serverTimestamp()).catch(() => {});
      }
      console.error('[sendCustomEmail] Exceção:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Erro ao enviar e-mail.');
    }
  }
);

module.exports = { sendCustomEmail };
