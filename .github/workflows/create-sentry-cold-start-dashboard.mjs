const ORG = 'luisices';
const TITLE = 'Cold Start — Functions de Pedidos (DEV)';
const TOKEN = process.env.SENTRY_AUTH_TOKEN;

if (!TOKEN) throw new Error('Secret SENTRY_AUTH_TOKEN não está disponível.');

const base = 'https://sentry.io/api/0';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`Sentry API ${response.status}: ${detail}`);
  }
  return body;
}

const existing = await request(`/organizations/${ORG}/dashboards/?per_page=100`);
const dashboard = Array.isArray(existing)
  ? existing.find((item) => item.title === TITLE)
  : null;

if (dashboard) {
  console.log(`Dashboard já existe: https://sentry.io/organizations/${ORG}/dashboard/${dashboard.id}/`);
  process.exit(0);
}

const coldStartFilter = 'span.op:function.cold_start';
const byFunction = ['firebase.function.id'];
const query = (aggregate, alias) => ({
  name: alias,
  fields: [aggregate, ...byFunction],
  aggregates: [aggregate],
  columns: byFunction,
  fieldAliases: [alias, 'Function'],
  conditions: coldStartFilter,
  orderby: `-${aggregate}`,
});

const widgets = [
  {
    title: 'Primeiras chamadas capturadas',
    description: 'Contagem amostrada dos spans function.cold_start, por Function.',
    displayType: 'line',
    widgetType: 'spans',
    interval: '1h',
    queries: [query('count(span.duration)', 'Cold starts')],
    layout: { x: 0, y: 0, w: 3, h: 2 },
  },
  {
    title: 'Duração do handler — p95',
    description: 'Percentil 95 da duração do handler nas primeiras chamadas observadas por processo.',
    displayType: 'line',
    widgetType: 'spans',
    interval: '1h',
    queries: [query('p95(span.duration)', 'Duração p95')],
    layout: { x: 3, y: 0, w: 3, h: 2 },
  },
  {
    title: 'Inicialização do módulo — média (ms)',
    description: 'Tempo de avaliação dos módulos registrado em runtime.module_init_ms.',
    displayType: 'line',
    widgetType: 'spans',
    interval: '1h',
    queries: [query('avg(runtime.module_init_ms)', 'Inicialização média (ms)')],
    layout: { x: 0, y: 2, w: 6, h: 2 },
  },
];

const created = await request(`/organizations/${ORG}/dashboards/`, {
  method: 'POST',
  body: JSON.stringify({
    title: TITLE,
    widgets,
    environment: ['development'],
    period: '30d',
    utc: false,
    is_favorited: true,
  }),
});

console.log(`Dashboard criado: https://sentry.io/organizations/${ORG}/dashboard/${created.id}/`);
