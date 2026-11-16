import { createRequire } from 'node:module';
import {
  assertActiveSessionFromBearer,
  getFirebaseAdmin,
  mapCoreErrorToHttp,
} from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const {
  approveAlexaPairingHandler,
  setAlexaPermissionHandler,
  revokeAlexaBindingHandler,
  toggleGlobalAlexaIntegrationHandler,
  getAlexaIntegrationStatusHandler,
  approveAlexaDraftHandler,
  cancelAlexaDraftHandler,
} = require('../functions/alexa/callables.js');

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
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { auth, firestore, projectId } = getFirebaseAdmin();
    if (!process.env.ALEXA_ENVIRONMENT) {
      process.env.ALEXA_ENVIRONMENT = projectId === 'papelaria-dashboard' ? 'prod' : 'dev';
    }
    const session = await assertActiveSessionFromBearer(
      auth,
      firestore,
      req.headers?.authorization,
    );

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action, ...payload } = (body || {}) as { action?: string } & Record<string, unknown>;
    const callableReq = {
      auth: { uid: session.uid, token: session.token },
      authProfile: session.profile,
      data: payload,
    };

    let result: unknown;
    switch (action) {
      case 'getStatus':
        result = await getAlexaIntegrationStatusHandler(callableReq, firestore);
        break;
      case 'approvePairing':
        result = await approveAlexaPairingHandler(callableReq, firestore);
        break;
      case 'setPermission':
        result = await setAlexaPermissionHandler(callableReq, firestore);
        break;
      case 'revokeBinding':
        result = await revokeAlexaBindingHandler(callableReq, firestore);
        break;
      case 'toggleGlobalIntegration':
        result = await toggleGlobalAlexaIntegrationHandler(callableReq, firestore);
        break;
      case 'approveDraft':
        result = await approveAlexaDraftHandler(callableReq, firestore);
        break;
      case 'cancelDraft':
        result = await cancelAlexaDraftHandler(callableReq, firestore);
        break;
      default:
        return res.status(400).json({ error: { code: 'invalid-argument', message: 'Ação Alexa inválida.' } });
    }

    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message, details } = mapCoreErrorToHttp(
      err,
      'Erro ao processar integração Alexa.',
    );
    return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
