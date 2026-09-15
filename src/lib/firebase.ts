/**
 * Firebase Configuration
 *
 * Setup do Firebase SDK para o projeto de papelaria personalizada
 */

import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getPerformance, FirebasePerformance, trace as firebaseTrace } from 'firebase/performance';

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

// Inicializar Firestore com cache persistente multi-aba moderno
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  ignoreUndefinedProperties: true,
});

// Serviços exportados
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(error => {
  console.warn('[Firebase] Não foi possível ativar persistência local:', error);
});
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Analytics & Performance (apenas em browser)
let analytics: Analytics | null = null;
let perf: FirebasePerformance | null = null;

if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
      console.log('[Firebase] Analytics inicializado');
    }
  });

  try {
    perf = getPerformance(app);
    console.log('[Firebase] Performance Monitoring inicializado');
  } catch (error) {
    console.warn('[Firebase] Performance Monitoring não disponível:', error);
  }

  // Expor referências apenas em desenvolvimento ou testes locais para diagnósticos e testes E2E
  const isLocalOrDev = import.meta.env.DEV ||
    ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

  if (isLocalOrDev) {
    (window as any).__firebaseConfig = {
      projectId: firebaseConfig.projectId,
      apiKey: firebaseConfig.apiKey,
      storageBucket: firebaseConfig.storageBucket,
    };
    (window as any).__firebaseAuth = auth;
    (window as any).__firebaseDb = db;
  }
}

/**
 * Utilitário para iniciar e finalizar traces de performance customizados
 */
export function createTrace(traceName: string) {
  if (!perf) return null;
  try {
    return firebaseTrace(perf, traceName);
  } catch {
    return null;
  }
}

export { analytics, perf, firebaseTrace as trace };
export default app;
