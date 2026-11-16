import { createRequire } from 'node:module';
import { getFirebaseAdmin } from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const { handleGetPublicCatalogProducts } = require('../functions/orders/catalog.js');

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
      { getFirestore: () => firestore, isEmulator: false },
    );
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[vercel/public-catalog-products] Failed:', error);
    return res.status(500).json({ error: 'Não foi possível carregar os produtos da loja.' });
  }
}
