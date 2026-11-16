import { createRequire } from 'node:module';
import { getFirebaseAdmin } from './_firebaseAdmin.js';

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
  status: (code: number) => { send: (body: string) => void };
}) {
  try {
    const galleryHandler = getGalleryHandler();
    return await galleryHandler(req, res);
  } catch (error) {
    console.error('[vercel/gallery-media] Initialization error:', error);
    return res.status(500).send('Unable to initialize gallery media handler');
  }
}
