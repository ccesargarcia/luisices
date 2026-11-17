import { createRequire } from 'node:module';
import {
  assertBetaEdgeRequest,
  assertActiveSessionFromBearer,
  getFirebaseAdmin,
  mapCoreErrorToHttp,
} from './_firebaseAdmin.js';
import { dispatchCommunicationsAction } from './_communicationsActionDispatcher.js';

const require = createRequire(import.meta.url);

export default async function handler(
  req: {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
  },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
      json: (body: unknown) => void;
      send: (body: string) => void;
    };
  },
) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    assertBetaEdgeRequest(req.headers?.['x-beta-edge-secret']);
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { auth, firestore } = getFirebaseAdmin();
    const session = await assertActiveSessionFromBearer(
      auth,
      firestore,
      req.headers?.authorization,
    );

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action, ...payload } = (body || {}) as { action?: string } & Record<string, unknown>;
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: { code: 'invalid-argument', message: 'Ação obrigatória.' } });
    }

    const callableRequest = {
      auth: { uid: session.uid, token: session.token },
      authProfile: session.profile,
      data: payload,
    };

    const result = await dispatchCommunicationsAction(action, callableRequest, {
      sendWhatsAppDirectMessage: (request) => {
        const { sendWhatsAppDirectMessage } = require('../functions/whatsapp/send.js');
        return sendWhatsAppDirectMessage(request);
      },
      deleteWhatsAppMessage: (request) => {
        const { deleteWhatsAppMessage } = require('../functions/whatsapp/delete.js');
        return deleteWhatsAppMessage(request);
      },
      syncWhatsAppChatMessages: (request) => {
        const { syncWhatsAppChatMessages } = require('../functions/whatsapp/sync.js');
        return syncWhatsAppChatMessages(request);
      },
      getWhatsAppInstanceStatus: (request) => {
        const { getWhatsAppInstanceStatus } = require('../functions/whatsapp/status.js');
        return getWhatsAppInstanceStatus(request);
      },
      markWhatsAppChatRead: (request) => {
        const { markWhatsAppChatRead } = require('../functions/whatsapp/conversations.js');
        return markWhatsAppChatRead(request);
      },
      ensureWhatsAppConversation: (request) => {
        const { ensureWhatsAppConversation } = require('../functions/whatsapp/conversations.js');
        return ensureWhatsAppConversation(request);
      },
      sendCustomEmail: (request) => {
        const { sendCustomEmail } = require('../functions/email/send.js');
        return sendCustomEmail(request);
      },
      getEmailUsage: (request) => {
        const { getEmailUsage } = require('../functions/email/usage.js');
        return getEmailUsage(request);
      },
    });

    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message, details } = mapCoreErrorToHttp(
      err,
      'Erro ao processar operação de comunicação.',
    );
    return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
