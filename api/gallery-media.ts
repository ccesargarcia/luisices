import { createRequire } from 'node:module';
import { ApiHttpError, assertBetaEdgeRequest, getFirebaseAdmin } from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const { createGalleryMediaHandler } = require('../functions/media/galleryCore.js');

let cachedHandler: ((req: unknown, res: unknown) => Promise<unknown>) | null = null;

function getGalleryHandler() {
  if (cachedHandler) return cachedHandler;
  const { auth, firestore, storage } = getFirebaseAdmin();
  cachedHandler = createGalleryMediaHandler({ auth, firestore, storage });
  return cachedHandler!;
}

export default async function handler(req: unknown, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
}) {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const headers = (req as { headers?: Record<string, string | string[] | undefined> } | null)?.headers;
    assertBetaEdgeRequest(headers?.['x-beta-edge-secret']);
    const galleryHandler = getGalleryHandler();
    return await galleryHandler(req, res);
  } catch (error) {
    if (error instanceof ApiHttpError) {
      return res.status(error.statusCode).send(error.message);
    }
    console.error('[vercel/gallery-media] Initialization error:', error);
    return res.status(500).send('Unable to initialize gallery media handler');
  }
}
