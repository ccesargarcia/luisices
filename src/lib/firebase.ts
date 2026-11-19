/**
 * Firebase Configuration
 *
 * Setup do Firebase SDK para o projeto de papelaria personalizada.
 * Dados persistentes do SDK não devem ser gravados sem criptografia no IndexedDB.
 */

import { initializeApp } from 'firebase/app';
import { browserSessionPersistence, inMemoryPersistence, getAuth, setPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache,
  terminate,
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth';
import { initializeAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getPerformance, FirebasePerformance, trace as firebaseTrace } from 'firebase/performance';

// Configuração do Firebase - valores vêm do .env.local (com fallback seguro para CI/testes)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-luisices.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-luisices',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-luisices.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-luisices'}-default-rtdb.firebaseio.com`,
};
const useFirebaseEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

// A SuperFrete integration uses the sandbox credential and is available only
// in the development Firebase project (or a local emulator).
export const isSuperfreteDevEnvironment =
  firebaseConfig.projectId === 'luisices-dev' || import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// O cache persistente nativo do Firestore grava documentos em IndexedDB sem
// criptografia configurável pelo aplicativo. Usamos somente memória.
export const db: Firestore = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  ignoreUndefinedProperties: true,
});

/** Remove o cache IndexedDB legado do Firestore antes da aplicação iniciar. */
const clearLegacyFirestoreCache = clearIndexedDbPersistence(db).catch(error => {
  console.warn('[Firebase] Não foi possível limpar o cache IndexedDB legado do Firestore:', error);
});
export const legacyFirestoreCacheCleanup = new Promise<void>(resolve => {
  const timeout = setTimeout(() => {
    console.warn('[Firebase] A limpeza do cache legado demorou; a inicialização seguirá sem cache persistente.');
    resolve();
  }, 1500);
  void clearLegacyFirestoreCache.then(() => {
    clearTimeout(timeout);
    resolve();
  });
});

/**
 * Recuperação de cache do Firestore em memória após asserções internas (ex.: b815).
 */
let isRecoveringPersistence = false;
export async function recoverFirestorePersistence(): Promise<void> {
  if (isRecoveringPersistence || typeof window === 'undefined') return;
  isRecoveringPersistence = true;

  try {
    const lastAttempt = Number(sessionStorage.getItem('firestore_recovery_timestamp') || '0');
    const now = Date.now();
    // Cooldown de 30s para evitar loops de reload se houver falha contínua
    if (now - lastAttempt < 30_000) {
      console.warn('[Firebase] Cooldown de auto-cura ativo. Evitando reexecução imediata.');
      return;
    }
    sessionStorage.setItem('firestore_recovery_timestamp', String(now));

    console.warn('[Firebase] Iniciando recuperação do estado local do Firestore...');
    try {
      await terminate(db);
      await clearIndexedDbPersistence(db);
      console.info('[Firebase] Estado persistente legado do Firestore limpo.');
    } catch (clearErr) {
      console.warn('[Firebase] Aviso ao limpar persistência do IndexedDB (outra aba pode estar ativa):', clearErr);
    }
    // Recarrega a página para restabelecer a conexão limpa com uma nova instância inicializada
    window.location.reload();
  } catch (err) {
    console.warn('[Firebase] Não foi possível completar o ciclo de auto-cura do Firestore:', err);
  } finally {
    isRecoveringPersistence = false;
  }
}

// Serviços exportados
export const auth = getAuth(app);

export const authPersistenceReady = setPersistence(auth, browserSessionPersistence).catch(async error => {
  console.warn('[Firebase] Persistência de sessão indisponível; usando sessão somente em memória:', error);
  await setPersistence(auth, inMemoryPersistence);
});

export const storage = getStorage(app);
export const database = getDatabase(app);
const functionsCustomDomain = import.meta.env.VITE_FUNCTIONS_CUSTOM_DOMAIN || undefined;
export const functions = functionsCustomDomain
  ? getFunctions(app, functionsCustomDomain)
  : getFunctions(app);

// Conexão com o Firebase Local Emulator Suite quando ativado via ambiente
if (useFirebaseEmulator) {
  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
  try {
    connectFirestoreEmulator(db, host, 8080);
    connectDatabaseEmulator(database, host, 9000);
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectStorageEmulator(storage, host, 9199);
    connectFunctionsEmulator(functions, host, 5001);
    console.info('[Firebase] Modo Emulator Suite Ativo (0 leituras na nuvem)');
  } catch (emulatorErr) {
    console.warn('[Firebase] Aviso ao conectar aos emuladores:', emulatorErr);
  }
}

// Analytics & Performance (apenas em browser)
let analytics: Analytics | null = null;
let perf: FirebasePerformance | null = null;

if (typeof window !== 'undefined') {
  // Analytics e Performance usam Firebase Installations, que exige uma API key válida
  // na nuvem. Em testes com emuladores esses serviços não são necessários.
  if (!useFirebaseEmulator) {
    isSupported().then(yes => {
      if (yes) {
        // Evita page_view automático com URL completa: a rota pública de acompanhamento
        // carrega um token bearer no caminho. As páginas internas já registram views
        // explicitamente pelo analyticsService.
        analytics = initializeAnalytics(app, { config: { send_page_view: false } });
        console.log('[Firebase] Analytics inicializado');
      }
    });

    try {
      perf = getPerformance(app);
      console.log('[Firebase] Performance Monitoring inicializado');
    } catch (error) {
      console.warn('[Firebase] Performance Monitoring não disponível:', error);
    }
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
