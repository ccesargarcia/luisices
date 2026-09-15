import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { initSentry } from "./lib/sentry";

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

createRoot(document.getElementById("root")!).render(<App />);
