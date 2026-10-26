// Mede somente importação/inicialização local. Nenhuma requisição ou escrita.
// --eager resolve todos os exports para comparar a carga anterior dos domínios.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const target = process.argv.find(arg => arg.startsWith('--target='))?.slice(9) || 'createOrder';
const samples = Number(process.argv.find(arg => arg.startsWith('--samples='))?.slice(10) || 7);
const eager = process.argv.includes('--eager');
if (!/^[A-Za-z]\w+$/.test(target) || !Number.isInteger(samples) || samples < 1 || samples > 50) {
  throw new Error('Use --target=nomeDoEndpoint e --samples=1..50.');
}
const results = [];
for (let i = 0; i < samples; i++) {
  const child = spawnSync(process.execPath, ['-e', `
    const start = performance.now();
    const functions = require('./index.js');
    if (${eager}) Object.values(functions);
    if (typeof functions[${JSON.stringify(target)}] !== 'function') throw new Error('Endpoint inexistente.');
    console.log(JSON.stringify({ ms: performance.now() - start,
      modules: Object.keys(require.cache).length, rssMiB: process.memoryUsage().rss / 1048576 }));
  `], {
    cwd: fileURLToPath(new URL('../functions', import.meta.url)), encoding: 'utf8', timeout: 30000,
    env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, GCLOUD_PROJECT: 'demo-luisices-startup' },
  });
  if (child.error || child.status !== 0) throw child.error || new Error(child.stderr || child.stdout);
  results.push(JSON.parse(child.stdout));
}
const median = key => results.map(row => row[key]).sort((a, b) => a - b)[Math.floor(samples / 2)];
console.log(JSON.stringify({ node: process.version, platform: process.platform, target, eager, samples,
  scope: 'local module initialization; no network, credentials, Sentry DSN or Cloud Run provisioning',
  medianMs: median('ms'), medianRssMiB: median('rssMiB'), modules: median('modules'), results }, null, 2));
