/**
 * Sentry Observability Configuration
 *
 * Monitoramento de erros em tempo real e rastreamento de performance
 * para a plataforma Luisices.
 */

import * as Sentry from '@sentry/react';

const DEFAULT_SENTRY_DSN = 'https://d29ba26f91dac0c5c56b94866f16c461@o4512090827980800.ingest.us.sentry.io/4512090844626944';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN || DEFAULT_SENTRY_DSN;

  if (!dsn || typeof window === 'undefined') return;

  const isDev =
    import.meta.env.DEV ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('dev.luisices');

  Sentry.init({
    dsn,
    environment: isDev ? 'development' : 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Rastreamento de performance: amostra controlada de 20% para respeitar cota gratuita
    tracesSampleRate: isDev ? 1.0 : 0.2,

    // Session Replay: grava sessão em vídeo interativo apenas quando ocorrer erro
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,

    // Ignorar ruídos inofensivos de extensões de navegador ou rede intermitente
    ignoreErrors: [
      'ResizeObserver loop completed with undelivered notifications',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
      'chrome-extension://',
      'moz-extension://',
    ],
  });
}

/**
 * Utilitário para reportar erros manuais capturados no código com contexto
 */
export function captureException(error: unknown, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export { Sentry };
