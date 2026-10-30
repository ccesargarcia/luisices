/**
 * Sentry para Cloud Functions. Este módulo deve ser carregado antes do Firebase
 * Admin e das declarações de triggers para permitir a instrumentação automática.
 */
const Sentry = require('@sentry/node');
const firstInvocationSpans = new Set();

/** Mede a primeira execução do handler e registra o tempo de avaliação do módulo separadamente. */
function withFirstInvocationSpan(functionId, handler, getModuleInitializationMs = () => null) {
  return function firstInvocationObserved(...args) {
    if (firstInvocationSpans.has(functionId)) return handler.apply(this, args);
    firstInvocationSpans.add(functionId);

    if (!Sentry.getClient()) return handler.apply(this, args);

    const moduleInitializationMs = typeof getModuleInitializationMs === 'function'
      ? getModuleInitializationMs()
      : null;
    if (Number.isFinite(moduleInitializationMs) && moduleInitializationMs >= 0) {
      try {
        Sentry.metrics.distribution('firebase.function.module_init_ms', moduleInitializationMs, {
          unit: 'millisecond',
          attributes: {
            'firebase.function.id': functionId,
            'runtime.revision': process.env.K_REVISION || 'local',
          },
        });
      } catch {
        // Uma falha de telemetria nunca deve impedir a execução da Function.
      }
    }

    return Sentry.startSpan({
      name: `firebase.function.${functionId}.first_invocation`,
      op: 'function.first_invocation',
      parentSpan: null,
      forceTransaction: true,
      attributes: {
        'firebase.function.id': functionId,
        'firebase.function.first_invocation': true,
        'runtime.module_init_ms': moduleInitializationMs,
        'runtime.node_major': Number(process.versions.node.split('.')[0]),
        'runtime.revision': process.env.K_REVISION || 'local',
      },
    }, () => handler.apply(this, args));
  };
}

function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\bBearer\s+[A-Za-z0-9_\-.~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/\blui_(?:oauth_at_|oauth_rt_|dev_|live_)[A-Za-z0-9_-]+\b/g, '[REDACTED_MCP_TOKEN]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]')
    .replace(/\bAIza[0-9A-Za-z-_]{35}\b/g, '[REDACTED_API_KEY]')
    .replace(/\bre_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_RESEND_KEY]')
    .replace(/\b(password|passwd|secret|api_?key|auth_?token|access_?token)(\s*[:=]\s*['"]?)[^\s'",;]{6,}(['"]?)/gi, '$1$2[REDACTED_CREDENTIAL]$3')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[REDACTED_CPF]');
}

function sanitizeValue(value, key = '', seen = new WeakSet()) {
  if (/authorization|cookie|password|token|secret|api.?key|email|phone|cpf|customer|order|user|name|body|payload|data/i.test(key)) {
    return '[REDACTED]';
  }
  if (typeof value === 'string') return sanitizeText(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[REDACTED_CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, '', seen));
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
    childKey,
    sanitizeValue(childValue, childKey, seen),
  ]));
}

function sanitizeEvent(event) {
  if (event.message) event.message = sanitizeText(event.message);
  if (event.user) delete event.user;
  if (event.request) {
    if (typeof event.request.url === 'string') event.request.url = event.request.url.split('?')[0].split('#')[0];
    if (event.request.data !== undefined) event.request.data = '[REDACTED]';
    if (event.request.cookies) delete event.request.cookies;
    if (event.request.headers) event.request.headers = sanitizeValue(event.request.headers);
  }
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((value) => ({
      ...value,
      value: sanitizeText(value.value),
    }));
  }
  if (event.extra) event.extra = sanitizeValue(event.extra);
  if (event.contexts) event.contexts = sanitizeValue(event.contexts);
  if (event.tags) event.tags = sanitizeValue(event.tags);
  if (event.spans) event.spans = event.spans.map(sanitizeSpan);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      message: sanitizeText(breadcrumb.message),
      data: breadcrumb.data ? sanitizeValue(breadcrumb.data) : breadcrumb.data,
    }));
  }
  return event;
}

function sanitizeSpan(span) {
  const hasQuery = Object.keys(span.attributes || span.data || {}).some((key) => /db\.(statement|query)/i.test(key));
  const scrubAttributes = (attributes) => Object.fromEntries(Object.entries(attributes || {}).map(([key, value]) => {
    // Consultas e corpos podem conter nomes livres que uma regex não reconhece.
    if (/db\.(statement|query)|body|payload|query_string/i.test(key)) return [key, '[REDACTED]'];
    if (/url/i.test(key) && typeof value === 'string') return [key, sanitizeText(value.split(/[?#]/)[0])];
    return [key, sanitizeValue(value, key)];
  }));
  const scrubName = (name) => typeof name === 'string' ? sanitizeText(name).replace(/\?[^\s]*/g, '?[REDACTED]') : name;
  return {
    ...span,
    ...(span.name !== undefined ? { name: hasQuery ? 'database.query' : scrubName(span.name) } : {}),
    ...(span.description !== undefined ? { description: hasQuery ? 'database.query' : scrubName(span.description) } : {}),
    ...(span.attributes ? { attributes: scrubAttributes(span.attributes) } : {}),
    ...(span.data ? { data: scrubAttributes(span.data) } : {}),
  };
}

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  const sampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);
  const defaultTraceSampleRate = Number.isFinite(sampleRate) && sampleRate >= 0 && sampleRate <= 1
    ? sampleRate
    : 0.05;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || (process.env.GCLOUD_PROJECT === 'luisices-dev' ? 'development' : 'production'),
    release: process.env.K_REVISION || undefined,
    sendDefaultPii: false,
    tracesSampler({ name, attributes, inheritOrSampleWith }) {
      const isFunctionFirstInvocation = attributes?.['sentry.op'] === 'function.cold_start'
        || name?.startsWith('firebase.function.') && name.endsWith('.first_invocation');
      if (isFunctionFirstInvocation) return 1;
      return inheritOrSampleWith(defaultTraceSampleRate);
    },
    beforeSend: sanitizeEvent,
    beforeSendSpan: sanitizeSpan,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) breadcrumb.message = sanitizeText(breadcrumb.message);
      if (breadcrumb.data) breadcrumb.data = sanitizeValue(breadcrumb.data);
      if (typeof breadcrumb.data?.url === 'string') breadcrumb.data.url = breadcrumb.data.url.split('?')[0].split('#')[0];
      return breadcrumb;
    },
  });
}

async function captureApiError(error, tags = {}) {
  if (!dsn || !Sentry.getClient()) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(tags)) {
      if (/^[a-z0-9_.-]{1,32}$/i.test(key) && typeof value === 'string') scope.setTag(key, value);
    }
    Sentry.captureException(error);
  });
  await Sentry.flush(1500);
}

module.exports = { Sentry, captureApiError, sanitizeEvent, sanitizeText, sanitizeValue, sanitizeSpan, withFirstInvocationSpan };
