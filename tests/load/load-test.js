import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const pageLoadTrend = new Trend('page_load_time', true);

// Configuração via variáveis de ambiente (definidas pelo workflow)
const BASE_URL = __ENV.BASE_URL || 'https://dev.luisices.com.br';
const VUS = parseInt(__ENV.VUS || '10');
const DURATION = __ENV.DURATION || '30s';

export const options = {
  stages: [
    { duration: '10s', target: Math.ceil(VUS / 2) }, // ramp-up
    { duration: DURATION, target: VUS },              // carga sustentada
    { duration: '10s', target: 0 },                    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% das requests abaixo de 3s
    errors: ['rate<0.1'],               // taxa de erro abaixo de 10%
  },
};

// Páginas principais da aplicação
const PAGES = [
  { name: 'Home / Login', path: '/' },
  { name: 'Login', path: '/login' },
  { name: '404 Page', path: '/404.html' },
];

// Recursos estáticos comuns
const ASSETS = [
  '/manifest.json',
];

export default function () {
  // 1. Testa carregamento das páginas principais
  for (const page of PAGES) {
    const res = http.get(`${BASE_URL}${page.path}`, {
      tags: { page: page.name },
    });

    const success = check(res, {
      [`${page.name} - status 200`]: (r) => r.status === 200,
      [`${page.name} - tempo < 3s`]: (r) => r.timings.duration < 3000,
    });

    errorRate.add(!success);
    pageLoadTrend.add(res.timings.duration);
  }

  // 2. Testa recursos estáticos
  for (const asset of ASSETS) {
    const res = http.get(`${BASE_URL}${asset}`, {
      tags: { type: 'static' },
    });

    check(res, {
      'asset carregado': (r) => r.status === 200,
    });
  }

  // 3. Simula comportamento real de usuário (pausa entre ações)
  sleep(1 + Math.random() * 2);
}

export function handleSummary(data) {
  const med = data.metrics.http_req_duration?.values?.med || 0;
  const p95 = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values['p(99)'] || 0;
  const reqs = data.metrics.http_reqs?.values?.count || 0;
  const rate = data.metrics.http_reqs?.values?.rate || 0;
  const fails = data.metrics.http_req_failed?.values?.passes || 0;

  const summary = `
# Resultado do Teste de Carga

| Métrica | Valor |
|---------|-------|
| URL Base | ${BASE_URL} |
| VUs (usuários virtuais) | ${VUS} |
| Duração sustentada | ${DURATION} |
| Total de requests | ${reqs} |
| Requests/segundo | ${rate.toFixed(2)} |
| Tempo médio | ${med.toFixed(0)}ms |
| P95 | ${p95.toFixed(0)}ms |
| P99 | ${p99.toFixed(0)}ms |
| Requests falhadas | ${fails} |
`;

  return {
    stdout: summary,
    'load-test-summary.md': summary,
  };
}
