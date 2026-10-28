import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import exportsByDomain from '../fixtures/functions-exports.json';

// Processo novo por caso: medir/verificar carregamento com cache já populado
// esconderia regressões. Não herdar credenciais, DSN ou flags de emulador.
function checkStartup(script: string, extraEnv: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const functions = require('./index.js');
    ${script}
  `], {
    cwd: path.resolve('functions'),
    encoding: 'utf8',
    timeout: 15000,
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      GCLOUD_PROJECT: 'demo-luisices-startup',
      ORIGIN_SECRET: 'startup-test-placeholder',
      ...extraEnv,
    },
  });
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

describe('inicialização das Functions com SDK real', () => {
  it('getAiUsage não carrega fábricas ou dependências do chat/Gemini', () => {
    checkStartup(`
      const handler = functions.getAiUsage;
      assert.equal(handler, require('./ai/usageCallable').getAiUsage);
      for (const modulePath of [
        './ai/callables', './ai/index', './ai/handlers', './ai/geminiClient', './ai/tools',
      ]) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.ok(!handler.__endpoint.secretEnvironmentVariables?.some(item => item.key === 'GEMINI_API_KEY'));
    `);
  });

  it('MCP carrega executor e repositórios sem inicializar a fábrica de chat/Gemini', () => {
    checkStartup(`
      const handler = functions.chatGptToolsEndpoint;
      assert.equal(handler, require('./mcp/endpoint').chatGptToolsEndpoint);
      for (const modulePath of [
        './ai/index', './ai/callables', './ai/handlers', './ai/geminiClient',
        './ai/budget', './ai/cache',
      ]) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.ok(require.cache[require.resolve('./ai/repositories')]);
      assert.ok(require.cache[require.resolve('./ai/tools')]);
    `);
  });

  it('enrichments preservam a telemetria Sentry e não carregam tools ou repositórios', () => {
    checkStartup(`
      const gallery = functions.enrichGalleryItemWithAi;
      const product = functions.enrichStoreProductWithAi;
      assert.equal(gallery, require('./ai/enrichmentCallables').enrichGalleryItemWithAi);
      assert.equal(product, require('./ai/enrichmentCallables').enrichStoreProductWithAi);
      for (const handler of [gallery, product]) {
        assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'GEMINI_API_KEY'));
        assert.equal(handler.__endpoint.timeoutSeconds, 120);
        assert.equal(handler.__endpoint.maxInstances, 5);
        assert.equal(handler.__endpoint.availableMemoryMb, 1024);
      }
      for (const modulePath of [
        './ai/index', './ai/callables', './ai/tools', './ai/repositories',
        './ai/cache', './ai/usage',
      ]) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.ok(require.cache[require.resolve('./ai/enrichmentServices')]);
      assert.ok(require.cache[require.resolve('./ai/handlers')]);
      assert.ok(require.cache[require.resolve('./common/sentry')]);
      const fs = require('node:fs');
      const enrichmentSource = fs.readFileSync(require.resolve('./ai/enrichmentCallables'), 'utf8');
      assert.ok(enrichmentSource.includes("withFirstInvocationSpan('enrichGalleryItemWithAi'"));
      assert.ok(enrichmentSource.includes("withFirstInvocationSpan('enrichStoreProductWithAi'"));
      assert.ok(enrichmentSource.includes('() => moduleInitializationMs'));
    `);
  });

  it('chat não inicializa as entradas de enriquecimento', () => {
    checkStartup(`
      const handler = functions.aiAgentChat;
      assert.equal(handler, require('./ai/callables').aiAgentChat);
      assert.equal(require.cache[require.resolve('./ai/enrichmentCallables')], undefined);
      assert.ok(require.cache[require.resolve('./ai/index')]);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'GEMINI_API_KEY'));
    `);
  });

  it.each(['createOrder', 'updateComplexOrder'])(
    '%s carrega apenas o domínio necessário e reutiliza o handler protegido', (target) => {
      checkStartup(`
        const domains = ${JSON.stringify(Object.keys(exportsByDomain))};
        for (const domain of domains) assert.equal(require.cache[require.resolve(domain)], undefined);
        const handler = functions[${JSON.stringify(target)}];
        assert.equal(typeof handler, 'function');
        assert.equal(handler, functions[${JSON.stringify(target)}]);
        assert.equal(handler, require('./orders')[${JSON.stringify(target)}]);
        assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'ORIGIN_SECRET'));
        // O SDK serializa ResetValue (padrão da plataforma) como null.
        assert.ok([null, 0].includes(JSON.parse(JSON.stringify(handler.__endpoint)).minInstances));
        assert.equal(handler.__endpoint.maxInstances, 10);
        for (const domain of domains.filter(name => name !== './orders')) {
          assert.equal(require.cache[require.resolve(domain)], undefined, domain + ' carregado indevidamente');
        }
      `);
    },
  );

  it('inicializa REST antes do primeiro getFirestore e reutiliza a instância', () => {
    checkStartup(`
      const { getFirestore, initializeFirestore } = require('firebase-admin/firestore');
      const { getApp } = require('firebase-admin/app');
      assert.equal(getFirestore(), initializeFirestore(getApp(), { preferRest: true }));
    `);
  });

  it('preserva transporte do emulador sem exigir credenciais da nuvem', () => {
    checkStartup(`
      const { getFirestore, initializeFirestore } = require('firebase-admin/firestore');
      const { getApp } = require('firebase-admin/app');
      assert.equal(getFirestore(), initializeFirestore(getApp(), { preferRest: false }));
    `, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' });
  });

  it.each([
    { project: 'demo-luisices-startup', emulator: '', sandbox: false },
    { project: 'luisices-dev', emulator: '', sandbox: true },
    { project: 'demo-luisices-startup', emulator: 'true', sandbox: true },
  ])('descoberta preserva exports, triggers e secrets: %j', ({ project, emulator, sandbox }) => {
    checkStartup(`
      (async () => {
        const domains = ${JSON.stringify(exportsByDomain)};
        const expected = Object.values(domains).flat();
        if (${sandbox}) expected.push('calculateSuperfreteShipping', 'createSuperfreteLabel');
        assert.deepEqual(Object.keys(functions).sort(), expected.sort());
        for (const [domain, names] of Object.entries(domains)) {
          for (const name of names) assert.equal(functions[name], require(domain)[name], name);
        }
        // Loader real do SDK: é o que o Firebase CLI usa para construir o manifest.
        const path = require('node:path');
        const sdkV2 = path.dirname(require.resolve('firebase-functions/v2'));
        const { loadStack } = require(path.join(sdkV2, '../runtime/loader.js'));
        const stack = await loadStack(process.cwd());
        assert.deepEqual(Object.keys(stack.endpoints).sort(), expected.sort());
        for (const name of expected) {
          assert.deepEqual(stack.endpoints[name], { ...functions[name].__endpoint, entryPoint: name });
        }
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `, { GCLOUD_PROJECT: project, FUNCTIONS_EMULATOR: emulator });
  });

  it.each(['createOrder', 'updateComplexOrder'])('%s continua negando origem inválida', (target) => {
    checkStartup(`
      (async () => {
        const handler = functions[${JSON.stringify(target)}];
        for (const headers of [{}, { 'x-origin-secret': 'invalid' }]) {
          await assert.rejects(handler.run({ rawRequest: { headers }, data: {},
            auth: { uid: 'fake-user', token: { role: 'admin' } } }), { code: 'permission-denied' });
        }
        await assert.rejects(handler.run({ rawRequest: { headers: {
          'x-origin-secret': 'startup-test-placeholder' } }, data: {} }), { code: 'unauthenticated' });
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `);
  });
});
