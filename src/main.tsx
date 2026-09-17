import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { initSentry } from "./lib/sentry";
import { recoverFirestorePersistence } from "./lib/firebase";

// Inicializa monitoramento de erros e performance do Sentry
initSentry();

// Desregistra proativamente qualquer Service Worker legado e limpa CacheStorage do navegador
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key).catch(() => {});
      }
    }).catch(() => {});
  }
}

// Trata erro de recurso dinâmico desatualizado sem disparar loop de reload automático
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[Vite] Recurso dinâmico desatualizado detectado. Limpando caches em background.');
  if (typeof window !== 'undefined' && 'caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key).catch(() => {});
      }
    }).catch(() => {});
  }
});

/**
 * Escudo Global contra Asserções Internas de SDKs (Firebase Firestore / Multi-tab)
 * Evita que erros assíncronos não tratados como "INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)"
 * quebrem o ciclo de renderização do React e aciona auto-recuperação do IndexedDB.
 */
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = reason instanceof Error ? reason.message : String(reason || '');

  const isFirestoreAssertion =
    reasonStr.includes('INTERNAL ASSERTION FAILED') ||
    reasonStr.includes('FIRESTORE') && (
      reasonStr.includes('b815') ||
      reasonStr.includes('Unexpected state') ||
      reasonStr.includes("reading 'Te'")
    );

  if (isFirestoreAssertion) {
    event.preventDefault(); // Impede que o erro derrube a aplicação
    console.warn('[Firebase Shield] Asserção interna do Firestore interceptada e neutralizada:', reasonStr);
    recoverFirestorePersistence().catch(() => {});
  }
});

createRoot(document.getElementById("root")!).render(<App />);
