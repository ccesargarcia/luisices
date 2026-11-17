import { createRequire } from 'node:module';
import { FieldValue } from 'firebase-admin/firestore';
import {
  assertBetaEdgeRequest,
  assertActiveSessionFromBearer,
  getFirebaseAdmin,
  mapCoreErrorToHttp,
} from './_firebaseAdmin.js';
import { dispatchBetaOrderAction } from './_orderTrackingActionDispatcher.js';

const require = createRequire(import.meta.url);
const {
  createOrderTrackingLinkCore,
  listOrderTrackingLinksCore,
  revokeOrderTrackingLinkCore,
  revokeOrderTrackingLinkByIdCore,
  deleteOrderTrackingLinkCore,
  deleteOrderTrackingLinksBatchCore,
} = require('../functions/orders/trackingAdminCore.js');
const {
  handleCreateOrder,
  handleUpdateComplexOrder,
} = require('../functions/orders/index.js');
const {
  handleCalculateSuperfreteShipping,
  handleCreateSuperfreteLabel,
} = require('../functions/orders/superfrete.js');

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
    const encryptionKeyBase64 = process.env.ORDER_TRACKING_ENCRYPTION_KEY || '';
    const callableRequest = {
      auth: { uid: session.uid, token: session.token },
      authProfile: session.profile,
      data: payload,
    };

    const betaAction = await dispatchBetaOrderAction(action || '', callableRequest, firestore, {
      createOrder: (request, db) => handleCreateOrder(request, db as typeof firestore),
      updateComplexOrder: (request, db) => handleUpdateComplexOrder(request, db as typeof firestore),
      calculateSuperfreteShipping: (request) => handleCalculateSuperfreteShipping(request),
      createSuperfreteLabel: (request) => handleCreateSuperfreteLabel(request),
    });
    if (betaAction.handled) return res.status(200).json(betaAction.result);

    let result: unknown;
    switch (action) {
      case 'create':
        result = await createOrderTrackingLinkCore(session.uid, payload, {
          db: firestore,
          fieldValue: FieldValue,
          encryptionKeyBase64,
        });
        break;
      case 'list':
        result = await listOrderTrackingLinksCore(session.uid, payload, {
          db: firestore,
          encryptionKeyBase64,
        });
        break;
      case 'revoke':
        result = await revokeOrderTrackingLinkCore(session.uid, payload, {
          db: firestore,
          fieldValue: FieldValue,
        });
        break;
      case 'revokeById':
        result = await revokeOrderTrackingLinkByIdCore(session.uid, payload, {
          db: firestore,
          fieldValue: FieldValue,
        });
        break;
      case 'delete':
        result = await deleteOrderTrackingLinkCore(session.uid, payload, {
          db: firestore,
          fieldValue: FieldValue,
        });
        break;
      case 'deleteBatch':
        result = await deleteOrderTrackingLinksBatchCore(session.uid, payload, {
          db: firestore,
          fieldValue: FieldValue,
        });
        break;
      default:
        return res.status(400).json({ error: { code: 'invalid-argument', message: 'Ação inválida.' } });
    }

    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message, details } = mapCoreErrorToHttp(
      err,
      'Erro ao processar link de acompanhamento.',
    );
    return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
