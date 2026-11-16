import { createRequire } from 'node:module';
import { Timestamp } from 'firebase-admin/firestore';
import { assertBetaEdgeRequest, getFirebaseAdmin, mapCoreErrorToHttp } from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const { handleSubmitPublicCatalogOrderCore } = require('../functions/orders/publicCatalogOrderCore.js');

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
    assertBetaEdgeRequest(req.headers?.['x-beta-edge-secret']);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { firestore } = getFirebaseAdmin();
    const result = await handleSubmitPublicCatalogOrderCore(body, {
      getFirestore: () => firestore,
      nowFn: () => Timestamp.now(),
    });
    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message, details } = mapCoreErrorToHttp(
      err,
      'Não foi possível registrar o pedido na loja.',
    );
    return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
