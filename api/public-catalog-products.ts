import { createRequire } from 'node:module';
import { getFirebaseAdmin } from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const { handleGetPublicCatalogProducts } = require('../functions/orders/catalogCore.js');

export default async function handler(
  req: { method?: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
      json: (body: unknown) => void;
      send: (body: string) => void;
    };
  },
) {
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { firestore } = getFirebaseAdmin();
    const result = await handleGetPublicCatalogProducts(
      {},
      { getFirestore: () => firestore, isEmulator: false, bypassCache: true },
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[vercel/public-catalog-products] Failed:', error);
    return res.status(500).json({ error: 'Não foi possível carregar os produtos da loja.' });
  }
}
