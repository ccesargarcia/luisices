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

  it('getEmailUsage carrega isolado do envio, anexos e webhook e mantém telemetria/secrets', () => {
    checkStartup(`
      const handler = functions.getEmailUsage;
      assert.equal(handler, require('./email/usage').getEmailUsage);
      assert.equal(require.cache[require.resolve('./email/send')], undefined,
        'consulta de uso não deve carregar o módulo completo de e-mail');
      for (const modulePath of [
        './email/webhook', './email/attachments', './email/cleanup', './email/spamFilter', './email/sendIdempotency',
      ]) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.equal(handler.__endpoint.maxInstances, 5);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'RESEND_API_KEY'));
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'ORIGIN_SECRET'));
      const fs = require('node:fs');
      const source = fs.readFileSync(require.resolve('./email/usage'), 'utf8');
      assert.ok(source.includes("withFirstInvocationSpan('getEmailUsage'"));
      assert.ok(source.includes('() => moduleInitializationMs'));
    `);
  });

  it('registerDeviceSession carrega isolada e mantém configuração de memória e contrato público', () => {
    checkStartup(`
      const handler = functions.registerDeviceSession;
      assert.equal(handler, require('./users/registerDeviceSession').registerDeviceSession);
      assert.equal(handler.__endpoint.availableMemoryMb, 512);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'ORIGIN_SECRET'));
      assert.equal(require.cache[require.resolve('./users')], undefined,
        'registro de sessão não deve carregar o módulo amplo de usuários');
      for (const modulePath of [
        './users/userSyncService', './users/deviceLogout', './email/send', './whatsapp/send', './mcp/profilePermissions',
      ]) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined,
          modulePath + ' carregado indevidamente');
      }
      assert.ok(require.cache[require.resolve('./users/registerDeviceSessionCore')]);
    `);
  });

  it('validateUserInvitation carrega isolada e mantém callable pública sem secrets', () => {
    checkStartup(`
      const handler = functions.validateUserInvitation;
      assert.equal(handler, require('./users/validateUserInvitation').validateUserInvitation);
      assert.equal(require.cache[require.resolve('./users')], undefined,
        'validação pública do convite não deve carregar o módulo amplo de usuários');
      assert.ok(require.cache[require.resolve('./users/validateUserInvitationCore')]);
      assert.equal(handler.__endpoint.secretEnvironmentVariables?.some(item =>
        item.key === 'RESEND_API_KEY' || item.key === 'EVOLUTION_API_KEY'), false);
    `);
  });

  it('limpeza de rascunhos carrega isolada do envio e do webhook e mantém agenda', () => {
    checkStartup(`
      const handler = functions.cleanupEmailDrafts;
      assert.equal(handler, require('./email/cleanup').cleanupEmailDrafts);
      for (const modulePath of [
        './email/send', './email/webhook', './email/attachments', './email/spamFilter',
        './email/sendIdempotency', './email/usage',
      ]) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.equal(handler.__endpoint.scheduleTrigger.schedule, 'every 24 hours');
      assert.equal(handler.__endpoint.scheduleTrigger.timeZone, 'America/Sao_Paulo');
      assert.equal(handler.__endpoint.timeoutSeconds, 540);
    `);
  });

  it('envio carrega isolado do webhook e da limpeza agendada', () => {
    checkStartup(`
      const handler = functions.sendCustomEmail;
      assert.equal(handler, require('./email/send').sendCustomEmail);
      for (const modulePath of ['./email/webhook', './email/cleanup', './email/cleanupCore', './email/usage']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'RESEND_API_KEY'));
    `);
  });

  it('webhook mantém secrets e fica isolado do envio e anexos', () => {
    checkStartup(`
      const handler = functions.resendReceivingWebhook;
      assert.equal(handler, require('./email/webhook').resendReceivingWebhook);
      for (const modulePath of ['./email/send', './email/cleanup', './email/attachments', './email/sendIdempotency']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      for (const secret of ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'ORIGIN_SECRET']) {
        assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === secret), secret);
      }
      assert.ok(require.cache[require.resolve('./email/webhookSecurity')]);
    `);
  });

  it('webhook Evolution carrega isolado das operações do painel e mantém autenticação/telemetria', () => {
    checkStartup(`
      const handler = functions.evolutionWhatsAppWebhook;
      assert.equal(handler, require('./whatsapp/webhook').evolutionWhatsAppWebhook);
      for (const modulePath of ['./whatsapp/send', './whatsapp/delete', './whatsapp/sync']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined,
          'o webhook não deve carregar ' + modulePath);
      }
      for (const dependency of ['./whatsapp/persistMessage']) {
        assert.ok(require.cache[require.resolve(dependency)], dependency + ' deveria estar carregado');
      }
      for (const secret of ['EVOLUTION_API_KEY', 'ORIGIN_SECRET']) {
        assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === secret), secret);
      }
      const fs = require('node:fs');
      const source = fs.readFileSync(require.resolve('./whatsapp/webhook'), 'utf8');
      assert.ok(source.includes("withFirstInvocationSpan('evolutionWhatsAppWebhook'"));
      assert.ok(source.includes('() => moduleInitializationMs'));
    `);
  });

  it('status WhatsApp carrega isolado do painel e preserva autorização, secret e telemetria', () => {
    checkStartup(`
      const handler = functions.getWhatsAppInstanceStatus;
      assert.equal(handler, require('./whatsapp/status').getWhatsAppInstanceStatus);
      for (const modulePath of ['./whatsapp/send', './whatsapp/delete', './whatsapp/sync']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined,
          'consulta do status não deve carregar ' + modulePath);
      }
      assert.equal(require.cache[require.resolve('./whatsapp/webhook')], undefined);
      assert.ok(require.cache[require.resolve('./whatsapp/authorization')]);
      assert.ok(require.cache[require.resolve('./whatsapp/statusCore')]);
      assert.equal(handler.__endpoint.maxInstances, 5);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'EVOLUTION_API_KEY'));
      const fs = require('node:fs');
      const source = fs.readFileSync(require.resolve('./whatsapp/status'), 'utf8');
      assert.ok(source.includes("withFirstInvocationSpan('getWhatsAppInstanceStatus'"));
      assert.ok(source.includes('() => moduleInitializationMs'));
    `);
  });

  it('conversas WhatsApp isolam leitura e abertura sem carregar envio/sincronização', () => {
    checkStartup(`
      for (const [name, telemetry] of [
        ['markWhatsAppChatRead', "withWhatsAppAuthorization('markWhatsAppChatRead'"],
        ['ensureWhatsAppConversation', "withWhatsAppAuthorization('ensureWhatsAppConversation'"],
      ]) {
        const handler = functions[name];
        assert.equal(handler, require('./whatsapp/conversations')[name]);
        assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'ORIGIN_SECRET'));
        const source = require('node:fs').readFileSync(require.resolve('./whatsapp/conversations'), 'utf8');
        assert.ok(source.includes(telemetry));
      }
      for (const modulePath of ['./whatsapp/send', './whatsapp/delete', './whatsapp/sync']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined,
          'operações de conversa não devem carregar ' + modulePath);
      }
      assert.equal(require.cache[require.resolve('./whatsapp/status')], undefined);
      assert.equal(require.cache[require.resolve('./whatsapp/webhook')], undefined);
      assert.ok(require.cache[require.resolve('./whatsapp/chatScope')],
        'a autorização por parceiro e conversa deve continuar sendo aplicada');
      assert.ok(require.cache[require.resolve('./whatsapp/authorization')]);
    `);
  });

  it('envio WhatsApp carrega isolado com secret, limite e telemetria', () => {
    checkStartup(`
      const handler = functions.sendWhatsAppDirectMessage;
      assert.equal(handler, require('./whatsapp/send').sendWhatsAppDirectMessage);
      assert.equal(handler.__endpoint.maxInstances, 5);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'EVOLUTION_API_KEY'));
      for (const modulePath of ['./whatsapp/delete', './whatsapp/sync', './whatsapp/conversations', './whatsapp/status', './whatsapp/webhook']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.ok(require.cache[require.resolve('./common/rateLimiters')], 'o rate limit do envio deve continuar ativo');
      assert.ok(require.cache[require.resolve('./whatsapp/authorization')]);
      assert.ok(require.cache[require.resolve('./whatsapp/chatScope')]);
      const source = require('node:fs').readFileSync(require.resolve('./whatsapp/send'), 'utf8');
      assert.ok(source.includes("withFirstInvocationSpan('sendWhatsAppDirectMessage'"));
      assert.ok(source.includes('() => moduleInitializationMs'));
    `);
  });

  it('exclusão WhatsApp carrega isolada com secret e telemetria', () => {
    checkStartup(`
      const handler = functions.deleteWhatsAppMessage;
      assert.equal(handler, require('./whatsapp/delete').deleteWhatsAppMessage);
      assert.equal(handler.__endpoint.maxInstances, 5);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'EVOLUTION_API_KEY'));
      for (const modulePath of ['./whatsapp/send', './whatsapp/sync', './whatsapp/conversations', './whatsapp/status', './whatsapp/webhook']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      assert.equal(require.cache[require.resolve('./common/rateLimiters')], undefined,
        'exclusão não deve carregar limitador específico de envio');
      assert.ok(require.cache[require.resolve('./whatsapp/authorization')]);
      assert.ok(require.cache[require.resolve('./whatsapp/chatScope')]);
      const source = require('node:fs').readFileSync(require.resolve('./whatsapp/delete'), 'utf8');
      assert.ok(source.includes("withFirstInvocationSpan('deleteWhatsAppMessage'"));
      assert.ok(source.includes('() => moduleInitializationMs'));
    `);
  });

  it('sincronização WhatsApp carrega isolada e preserva autorização, secret e telemetria', () => {
    checkStartup(`
      const handler = functions.syncWhatsAppChatMessages;
      assert.equal(handler, require('./whatsapp/sync').syncWhatsAppChatMessages);
      assert.equal(handler.__endpoint.maxInstances, 5);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'EVOLUTION_API_KEY'));
      for (const modulePath of ['./whatsapp/send', './whatsapp/delete', './whatsapp/status', './whatsapp/conversations', './whatsapp/webhook']) {
        assert.equal(require.cache[require.resolve(modulePath)], undefined, modulePath + ' carregado indevidamente');
      }
      for (const modulePath of ['./whatsapp/authorization', './whatsapp/chatScope', './whatsapp/syncCore']) {
        assert.ok(require.cache[require.resolve(modulePath)], modulePath + ' deveria estar carregado');
      }
      const fs = require('node:fs');
      const source = fs.readFileSync(require.resolve('./whatsapp/sync'), 'utf8');
      assert.ok(source.includes("withFirstInvocationSpan('syncWhatsAppChatMessages'"));
      assert.ok(source.includes('() => moduleInitializationMs'));
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

  it('SuperFrete Sandbox é carregado diretamente e não inicializa o módulo principal de pedidos', () => {
    checkStartup(`
      const quote = functions.calculateSuperfreteShipping;
      const label = functions.createSuperfreteLabel;
      const sandbox = require('./orders/superfrete');
      assert.equal(quote, sandbox.calculateSuperfreteShipping);
      assert.equal(label, sandbox.createSuperfreteLabel);
      assert.equal(require.cache[require.resolve('./orders')], undefined,
        'o módulo principal de pedidos não deve ser carregado pelo Superfrete');
      assert.ok(quote.__endpoint.secretEnvironmentVariables.some(item => item.key === 'SUPERFRETE_SANDBOX_TOKEN'));
      assert.ok(label.__endpoint.secretEnvironmentVariables.some(item => item.key === 'SUPERFRETE_SANDBOX_TOKEN'));
    `, { GCLOUD_PROJECT: 'luisices-dev' });
  });

  it('catálogo público carrega isolado e preserva a configuração da callable', () => {
    checkStartup(`
      const handler = functions.getPublicCatalogProducts;
      assert.equal(handler, require('./orders/catalog').getPublicCatalogProducts);
      assert.equal(require.cache[require.resolve('./orders')], undefined,
        'o módulo principal de pedidos não deve ser carregado para ler o catálogo');
      assert.equal(handler.__endpoint.maxInstances, 10);
      assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'ORIGIN_SECRET'));
    `);
  });

  it('tracking carrega isolado do núcleo e preserva secrets, opções e telemetria', () => {
    checkStartup(`
      const names = ${JSON.stringify(exportsByDomain['./orders/tracking'])};
      for (const name of names) {
        const handler = functions[name];
        assert.equal(handler, require('./orders/tracking')[name]);
        assert.ok(handler.__endpoint.secretEnvironmentVariables.some(item => item.key === 'ORIGIN_SECRET'));
      }
      assert.equal(functions.createOrderTrackingLink.__endpoint.maxInstances, 10);
      assert.ok(functions.createOrderTrackingLink.__endpoint.secretEnvironmentVariables.some(
        item => item.key === 'ORDER_TRACKING_ENCRYPTION_KEY'));
      assert.equal(functions.getPublicOrderTracking.__endpoint.maxInstances, 20);
      assert.equal(require.cache[require.resolve('./orders')], undefined,
        'tracking não deve carregar as mutations transacionais');
      assert.ok(require.cache[require.resolve('./orders/tracking')]);
      const fs = require('node:fs');
      const source = fs.readFileSync(require.resolve('./orders/tracking'), 'utf8');
      for (const name of names) assert.ok(source.includes("withFirstInvocationSpan('" + name + "'"));
      assert.ok(source.includes('() => moduleInitializationMs'));
    `);
  });

  it.each([
    { project: 'demo-luisices-startup', emulator: '', sandbox: false },
    { project: 'luisices-dev', emulator: '', sandbox: true },
    { project: 'demo-luisices-startup', emulator: 'true', sandbox: true },
  ])('descoberta preserva exports, triggers e secrets: %j', ({ project, emulator, sandbox }) => {
    checkStartup(`
      (async () => {
        const domains = ${JSON.stringify(exportsByDomain)};
        const domainEntries = Object.entries(domains).filter(([domain]) =>
          domain !== './orders/superfrete' || ${sandbox});
        const expected = domainEntries.flatMap(([, names]) => names);
        assert.deepEqual(Object.keys(functions).sort(), expected.sort());
        for (const [domain, names] of domainEntries) {
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
