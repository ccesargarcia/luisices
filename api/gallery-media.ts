import { createRequire } from 'node:module';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, initializeFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const require = createRequire(import.meta.url);
const { createGalleryMediaHandler } = require('../functions/media/galleryCore.js');

let cachedHandler: ((req: unknown, res: unknown) => Promise<unknown>) | null = null;

function getGalleryHandler() {
  if (cachedHandler) return cachedHandler;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_DEV;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_DEV não configurado na Vercel.');
  }

  const serviceAccount = JSON.parse(rawServiceAccount);
  const projectId = serviceAccount.project_id || 'luisices-dev';
  const storageBucket =
    process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket,
    });

  let firestore;
  try {
    firestore = initializeFirestore(app, { preferRest: true });
  } catch {
    firestore = getFirestore(app);
  }

  cachedHandler = createGalleryMediaHandler({
    auth: getAuth(app),
    firestore,
    storage: getStorage(app),
  });

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
