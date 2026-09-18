/**
 * Firebase Configuration
 *
 * Setup do Firebase SDK para o projeto de papelaria personalizada
 * Inclui auto-cura contra asserções internas de colisão de abas do Firestore (ex: erro b815).
 */

import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  clearIndexedDbPersistence,
  Firestore,
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
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  ignoreUndefinedProperties: true,
});

/**
 * Auto-Cura de Persistência do Firestore
 * Se o SDK sofrer descompasso ou corrupção de targetId entre abas (ex: asserção b815),
 * limpa com segurança o cache IndexedDB sem afetar as credenciais ou dados na nuvem.
 */
let isRecoveringPersistence = false;
export async function recoverFirestorePersistence(): Promise<void> {
  if (isRecoveringPersistence || typeof window === 'undefined') return;
  isRecoveringPersistence = true;

  try {
    console.warn('[Firebase] Iniciando auto-cura do cache IndexedDB do Firestore...');
    await terminate(db);
    await clearIndexedDbPersistence(db);
    console.info('[Firebase] Cache IndexedDB resetado com sucesso.');
  } catch (err) {
    console.warn('[Firebase] Não foi possível limpar IndexedDB no momento (outra aba ativa):', err);
  } finally {
    isRecoveringPersistence = false;
  }
}

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
