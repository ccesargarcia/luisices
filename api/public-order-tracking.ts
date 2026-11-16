import { createRequire } from 'node:module';
import { getFirebaseAdmin, mapCoreErrorToHttp } from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const { handleGetPublicOrderTrackingCore } = require('../functions/orders/trackingCore.js');

export default async function handler(
  req: { method?: string; query?: Record<string, string | string[] | undefined> },
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
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawToken = req.query?.token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const { firestore } = getFirebaseAdmin();
    const result = await handleGetPublicOrderTrackingCore(token, {
      getFirestore: () => firestore,
    });
    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message, details } = mapCoreErrorToHttp(
      err,
      'Não foi possível consultar o rastreamento do pedido.',
    );
    return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
