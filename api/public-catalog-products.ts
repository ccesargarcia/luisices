import { createRequire } from 'node:module';
import { ApiHttpError, assertBetaEdgeRequest, getFirebaseAdmin } from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const { handleGetPublicCatalogProducts } = require('../functions/orders/catalogCore.js');

export default async function handler(
  req: { method?: string; headers?: Record<string, string | string[] | undefined> },
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
    assertBetaEdgeRequest(req.headers?.['x-beta-edge-secret']);
    const { firestore } = getFirebaseAdmin();
    const result = await handleGetPublicCatalogProducts(
      {},
      { getFirestore: () => firestore, isEmulator: false, bypassCache: true },
    );
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ApiHttpError) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
    }
    console.error('[vercel/public-catalog-products] Failed:', error);
    return res.status(500).json({ error: 'Não foi possível carregar os produtos da loja.' });
  }
}
