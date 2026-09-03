/**
 * Firebase Configuration
 *
 * Setup do Firebase SDK para o projeto de papelaria personalizada
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

// Configuração do Firebase - valores vêm do .env.local
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Serviços exportados
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Habilitar offline persistence do Firestore
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Offline persistence não habilitado: múltiplas abas abertas');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Offline persistence não suportado neste navegador');
    } else {
      console.error('[Firebase] Erro ao habilitar offline persistence:', err);
    }
  });
}

// Analytics (apenas em produção/browser)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
      console.log('[Firebase] Analytics inicializado');
    }
  });
}

export { analytics };
export default app;
