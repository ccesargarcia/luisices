
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

// Trata erro de chunk desatualizado após novos deploys de forma segura (evita loop infinito de reload)
window.addEventListener('vite:preloadError', async (event) => {
  event.preventDefault();

  const now = Date.now();
  const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || '0');

  // Se já tentou recarregar nos últimos 15 segundos, NÃO recarrega novamente para evitar loop infinito
  if (now - lastReload < 15000) {
    console.warn('[Vite] Múltiplos erros de chunk detectados em curto intervalo. Interrompendo loop de reload.');
    return;
  }

  sessionStorage.setItem('last_chunk_reload', String(now));

  // Limpa Service Worker e caches do navegador para garantir que o próximo load busque os bundles novos
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch (err) {
    console.warn('[Vite] Erro ao limpar caches:', err);
  }

  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
