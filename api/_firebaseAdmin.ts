import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

interface FirebaseAdminBundle {
  auth: Auth;
  firestore: Firestore;
  storage: Storage;
}

let cachedBundle: FirebaseAdminBundle | null = null;

export function getFirebaseAdmin(): FirebaseAdminBundle {
  if (cachedBundle) return cachedBundle;

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

  let firestore: Firestore;
  try {
    firestore = initializeFirestore(app, { preferRest: true });
  } catch {
    firestore = getFirestore(app);
  }

  cachedBundle = {
    auth: getAuth(app),
    firestore,
    storage: getStorage(app),
  };

  return cachedBundle;
}
