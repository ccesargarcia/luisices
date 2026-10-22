import fs from 'node:fs';
import path from 'node:path';

const resultsDir = process.env.TEST_RESULTS_DIR || 'test-results';
const trendDir = process.env.TEST_TREND_DIR || 'test-trends';
const historyPath = path.join(trendDir, 'history.json');
const maxHistory = 20;

fs.mkdirSync(trendDir, { recursive: true });

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function jsonFiles(prefix) {
  if (!fs.existsSync(resultsDir)) return [];
  return fs.readdirSync(resultsDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
    .map((name) => ({ name, data: readJson(path.join(resultsDir, name)) }))
    .filter((entry) => entry.data);
}

function emptyMetrics() {
  return { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0, durationMs: 0, files: 0 };
}

function addMetrics(target, source) {
  target.total += source.total || 0;
  target.passed += source.passed || 0;
  target.failed += source.failed || 0;
  target.skipped += source.skipped || 0;
  target.flaky += source.flaky || 0;
  target.durationMs += source.durationMs || 0;
  target.files += 1;
}

const suites = {
  unit: emptyMetrics(),
  integration: emptyMetrics(),
  e2e: emptyMetrics(),
};

for (const { data } of jsonFiles('vitest-unit-')) {
  const suite = suites.unit;
  addMetrics(suite, {
    total: data.numTotalTests,
    passed: data.numPassedTests,
    failed: data.numFailedTests,
    skipped: (data.numPendingTests || 0) + (data.numTodoTests || 0),
    durationMs: (data.testResults || []).reduce((sum, result) => {
      const duration = Number(result.endTime) - Number(result.startTime);
      return sum + (Number.isFinite(duration) && duration > 0 ? duration : 0);
    }, 0),
  });
}

for (const { data } of jsonFiles('vitest-integration-')) {
  addMetrics(suites.integration, {
    total: data.numTotalTests,
    passed: data.numPassedTests,
    failed: data.numFailedTests,
    skipped: (data.numPendingTests || 0) + (data.numTodoTests || 0),
    durationMs: (data.testResults || []).reduce((sum, result) => {
      const duration = Number(result.endTime) - Number(result.startTime);
      return sum + (Number.isFinite(duration) && duration > 0 ? duration : 0);
    }, 0),
  });
}

for (const { data } of jsonFiles('playwright-shard-')) {
  const stats = data.stats || {};
  addMetrics(suites.e2e, {
    total: (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0) + (stats.flaky || 0),
    passed: (stats.expected || 0) + (stats.flaky || 0),
    failed: stats.unexpected || 0,
    skipped: stats.skipped || 0,
    flaky: stats.flaky || 0,
    durationMs: Number(stats.duration) || 0,
  });
}

const presentSuites = Object.values(suites).filter((suite) => suite.files > 0);
const total = presentSuites.reduce((sum, suite) => sum + suite.total, 0);
const passed = presentSuites.reduce((sum, suite) => sum + suite.passed, 0);
const failed = presentSuites.reduce((sum, suite) => sum + suite.failed, 0);
const skipped = presentSuites.reduce((sum, suite) => sum + suite.skipped, 0);
const durationMs = presentSuites.reduce((sum, suite) => sum + suite.durationMs, 0);
const successRate = total > 0 ? Number((passed / total * 100).toFixed(1)) : 0;

const run = {
  id: `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || 1}`,
  label: `#${process.env.GITHUB_RUN_NUMBER || 'local'}`,
  branch: process.env.TEST_TREND_BRANCH || 'unknown',
  target: process.env.TEST_TREND_TARGET || 'all',
  date: new Date().toISOString(),
  total,
  passed,
  failed,
  skipped,
  successRate,
  durationMs,
  suites,
};

const previousHistory = readJson(historyPath);
const history = Array.isArray(previousHistory?.runs) ? previousHistory.runs : [];
history.push(run);
const retainedRuns = history.slice(-maxHistory);
fs.writeFileSync(historyPath, `${JSON.stringify({ runs: retainedRuns }, null, 2)}\n`);

const matchingPrevious = retainedRuns.slice(0, -1).filter((item) => item.target === run.target).at(-1);
const previous = matchingPrevious || retainedRuns.at(-2);

function duration(ms) {
  if (!ms) return '—';
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

const suiteRows = Object.entries(suites)
  .filter(([, suite]) => suite.files > 0)
  .map(([name, suite]) => `| ${name} | ${suite.passed} | ${suite.failed} | ${suite.skipped} | ${suite.flaky} | ${duration(suite.durationMs)} |`);

function svgChart(metric, title, formatter) {
  const chartRuns = retainedRuns.filter((item) => item.target === run.target).slice(-10);
  const width = 760;
  const height = 300;
  const pad = { left: 64, right: 24, top: 42, bottom: 54 };
  const values = chartRuns.map((item) => metric === 'successRate'
    ? Number(item.successRate) || 0
    : Math.round((Number(item.durationMs) || 0) / 1000));
  const max = metric === 'successRate' ? 100 : Math.max(1, ...values) * 1.15;
  const x = (i) => pad.left + (chartRuns.length <= 1 ? 0 : i * (width - pad.left - pad.right) / (chartRuns.length - 1));
  const y = (value) => height - pad.bottom - (Math.max(0, value) / max) * (height - pad.top - pad.bottom);
  const points = values.map((value, i) => `${x(i)},${y(value)}`).join(' ');
  const grid = Array.from({ length: 5 }, (_, i) => {
    const value = max * i / 4;
    return `<line x1="${pad.left}" y1="${y(value)}" x2="${width - pad.right}" y2="${y(value)}" stroke="#e2e8f0"/><text x="${pad.left - 10}" y="${y(value) + 4}" text-anchor="end" fill="#64748b" font-size="11">${formatter(value)}</text>`;
  }).join('');
  const dots = values.map((value, i) => `<circle cx="${x(i)}" cy="${y(value)}" r="4" fill="#2563eb"><title>${chartRuns[i].label}: ${formatter(value)}</title></circle><text x="${x(i)}" y="${height - 24}" text-anchor="middle" fill="#64748b" font-size="10">${chartRuns[i].label}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="${pad.left}" y="24" fill="#0f172a" font-size="16" font-weight="600">${title}</text>${grid}<polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}

const chartRuns = retainedRuns.filter((item) => item.target === run.target).slice(-10);
const successValues = chartRuns.map((item) => Math.round(Number(item.successRate) || 0));
const durationValues = chartRuns.map((item) => Math.round((Number(item.durationMs) || 0) / 1000));
const chartLabels = chartRuns.map((item) => JSON.stringify(item.label)).join(', ');
const summary = [
  '## Tendência dos testes',
  `Execução **${run.label}** · branch \`${run.branch}\` · alvo \`${run.target}\``,
  '',
  '| Suíte | Passaram | Falharam | Ignorados | Instáveis | Duração |',
  '|:--|--:|--:|--:|--:|--:|',
  ...suiteRows,
  `| **Total** | **${passed}** | **${failed}** | **${skipped}** | **${presentSuites.reduce((sum, suite) => sum + suite.flaky, 0)}** | **${duration(durationMs)}** |`,
  '',
  `**Taxa de aprovação:** ${successRate}% (${passed}/${total || 0})`,
  previous
    ? `**Comparação com ${previous.label}** (${previous.target}): aprovação ${successRate >= previous.successRate ? '+' : ''}${(successRate - previous.successRate).toFixed(1)} pp; duração ${duration(durationMs)} vs ${duration(previous.durationMs)}.`
    : '**Comparação:** ainda sem execução histórica disponível para este alvo.',
  '',
  '### Aprovação por execução (últimas 10)',
  '```mermaid',
  'xychart-beta',
  `  x-axis [${chartLabels || '"sem histórico"'}]`,
  '  y-axis "Aprovação (%)" 0 --> 100',
  `  line [${successValues.join(', ') || '0'}]`,
  '```',
  '',
  '### Duração por execução (segundos)',
  '```mermaid',
  'xychart-beta',
  `  x-axis [${chartLabels || '"sem histórico"'}]`,
  `  y-axis "Segundos" 0 --> ${Math.max(10, ...durationValues)}`,
  `  line [${durationValues.join(', ') || '0'}]`,
  '```',
  '',
  'Os gráficos SVG e os dados históricos estão disponíveis no artefato **test-trends**.',
].join('\n');

fs.writeFileSync(path.join(trendDir, 'success-rate.svg'), svgChart('successRate', 'Taxa de aprovação (%)', (value) => `${Math.round(value)}%`));
fs.writeFileSync(path.join(trendDir, 'duration.svg'), svgChart('duration', 'Duração dos testes (s)', (value) => `${Math.round(value)}s`));
fs.writeFileSync(path.join(trendDir, 'summary.md'), `${summary}\n`);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_metrics=${total > 0}\n`);
}

console.log(`Resumo criado: ${passed} aprovados, ${failed} falhos, ${skipped} ignorados; aprovação ${successRate}%.`);
