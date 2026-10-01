/**
 * Sentry Observability Configuration
 *
 * Monitoramento de erros em tempo real e rastreamento de performance
 * para a plataforma Luisices.
 */

import * as Sentry from '@sentry/react';

const DEFAULT_SENTRY_DSN = 'https://d29ba26f91dac0c5c56b94866f16c461@o4512090827980800.ingest.us.sentry.io/4512090844626944';

export function sanitizePii(str: string): string {
  if (typeof str !== 'string') return str;
  // Redact emails
  let sanitized = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  // Redact Brazilian phone numbers (10 to 11 digits with or without DDD/country code)
  sanitized = sanitized.replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/g, '[REDACTED_PHONE]');
  // Redact CPF (000.000.000-00 or 11 digits)
  sanitized = sanitized.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[REDACTED_CPF]');
  return sanitized;
}

export function sanitizeObject<T>(obj: T, seen = new WeakSet()): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizePii(obj) as unknown as T;
  if (typeof obj !== 'object') return obj;
  if (seen.has(obj as any)) return obj;
  seen.add(obj as any);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, seen)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (/password|token|secret|auth|credit|card|cvv/i.test(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = sanitizeObject(value, seen);
    }
  }
  return result as T;
}

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
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Sanitização rigorosa de PII antes de transmitir para os servidores do Sentry
    beforeSend(event) {
      if (event.message) {
        event.message = sanitizePii(event.message);
      }
      if (event.exception?.values) {
        event.exception.values.forEach((val) => {
          if (val.value) val.value = sanitizePii(val.value);
        });
      }
      if (event.extra) {
        event.extra = sanitizeObject(event.extra);
      }
      if (event.contexts) {
        event.contexts = sanitizeObject(event.contexts);
      }
      if (event.request?.url) {
        event.request.url = sanitizePii(event.request.url);
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) {
        breadcrumb.message = sanitizePii(breadcrumb.message);
      }
      if (breadcrumb.data) {
        breadcrumb.data = sanitizeObject(breadcrumb.data);
      }
      return breadcrumb;
    },

    // Rastreamento de performance: amostra controlada de 20% para respeitar cota gratuita
    tracesSampleRate: isDev ? 1.0 : 0.2,

    // Session Replay: grava sessão com máscara integral apenas quando ocorrer erro
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,

    // Ignorar ruídos inofensivos de extensões de navegador ou rede intermitente
    ignoreErrors: [
      'ResizeObserver loop completed with undelivered notifications',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
      'INTERNAL ASSERTION FAILED',
      'b815',
      'Cannot read properties of null (reading \'Te\')',
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

