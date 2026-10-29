import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFunctions } from '../../scripts/select-functions-deploy.mjs';

const fixture = () => ({
  'functions/index.js': `require('./bootstrap');
const orders = require('./orders');
const users = require('./users');
module.exports = { createOrder: orders.createOrder, updateOrder: orders.updateOrder, createUser: users.createUser };
if (process.env.GCLOUD_PROJECT === 'luisices-dev') { module.exports.sandbox = orders.sandbox; }`,
  'functions/orders/index.js': "require('../common/payment'); module.exports = {};",
  'functions/users/index.js': "require('../common/auth'); module.exports = {};",
  'functions/common/payment.js': "require('./auth');",
  'functions/common/auth.js': 'module.exports = {};',
  'functions/bootstrap.js': 'module.exports = {};',
  'functions/package.json': '{"engines":{"node":"22"}}',
  'functions/package-lock.json': '{}',
  'firebase.json': '{"functions":{"runtime":"nodejs22"},"hosting":{"public":"dist"}}',
});
const orderNames = ['createOrder', 'sandbox', 'updateOrder'];
const coreOrderNames = ['createOrder', 'updateOrder'];
const allNames = ['createOrder', 'createUser', 'sandbox', 'updateOrder'];
const allLazyNames = [...allNames, 'getPublicCatalogProducts', 'tracking'].sort();

test('no runtime changes selects nothing', () => {
  assert.deepEqual(selectFunctions(fixture(), fixture()).targets, []);
});
test('order module change selects only all endpoints of that module', () => {
  const after = fixture();
  after['functions/orders/index.js'] += '\n// changed handler';
  assert.deepEqual(selectFunctions(fixture(), after).targets, orderNames);
});
test('transitive dependency selects every consumer', () => {
  const after = fixture();
  after['functions/common/auth.js'] += '\n// changed auth';
  assert.deepEqual(selectFunctions(fixture(), after).targets, allNames);
});
test('payment dependency does not redeploy unrelated users', () => {
  const after = fixture();
  after['functions/common/payment.js'] += '\n// changed payment';
  assert.deepEqual(selectFunctions(fixture(), after).targets, orderNames);
});
test('global bootstrap change selects all endpoints', () => {
  const after = fixture();
  after['functions/bootstrap.js'] += '\n// changed instrumentation';
  assert.deepEqual(selectFunctions(fixture(), after).targets, allNames);
});
test('README edits do not deploy backend', () => {
  const after = fixture();
  after['functions/README.md'] = 'docs';
  assert.deepEqual(selectFunctions(fixture(), after).targets, []);
});
test('unreferenced runtime assets conservatively redeploy all endpoints', () => {
  const after = fixture();
  after['functions/templates/email.html'] = '<h1>Changed template</h1>';
  assert.deepEqual(selectFunctions(fixture(), after).targets, allNames);
});
test('Firebase hosting config does not redeploy backend', () => {
  const after = fixture();
  after['firebase.json'] = '{"functions":{"runtime":"nodejs22"},"hosting":{"public":"other"}}';
  assert.deepEqual(selectFunctions(fixture(), after).targets, []);
});
test('runtime config and lockfile changes deploy all', () => {
  for (const file of ['functions/package.json', 'functions/package-lock.json', 'scripts/sync-secrets-safe.mjs']) {
    const after = fixture();
    after[file] = `${after[file] || ''}\n// changed`;
    assert.deepEqual(selectFunctions(fixture(), after).targets, allNames);
  }
  const after = fixture();
  after['firebase.json'] = '{"functions":{"runtime":"nodejs24"}}';
  assert.deepEqual(selectFunctions(fixture(), after).targets, allNames);
});
test('first deploy and explicit force select all current exports', () => {
  assert.deepEqual(selectFunctions({}, fixture()).targets, allNames);
  assert.deepEqual(selectFunctions(fixture(), fixture(), { force: true }).targets, allNames);
});
test('removed exports are reported but never submitted for automatic deletion', () => {
  const after = fixture();
  after['functions/index.js'] = after['functions/index.js'].replace('createUser: users.createUser', '');
  const plan = selectFunctions(fixture(), after);
  assert.deepEqual(plan.removed, ['createUser']);
  assert.deepEqual(plan.targets, orderNames);
});
test('new exports cannot be missed when root entrypoint changes', () => {
  const after = fixture();
  after['functions/index.js'] += '\nmodule.exports.extra = orders.extra;';
  assert.deepEqual(selectFunctions(fixture(), after).targets, [...allNames, 'extra'].sort());
});
test('dependency cycles terminate', () => {
  const before = fixture();
  before['functions/common/auth.js'] = "require('./payment');";
  const after = { ...before, 'functions/common/payment.js': 'module.exports = {};' };
  assert.deepEqual(selectFunctions(before, after).targets, allNames);
});
test('unknown exports, missing modules, and dynamic imports stop selection safely', () => {
  const after = fixture();
  after['functions/index.js'] = 'module.exports = external();';
  assert.throws(() => selectFunctions(fixture(), after), /exports desconhecido/);
  const missing = fixture();
  delete missing['functions/common/payment.js'];
  assert.throws(() => selectFunctions(fixture(), missing), /não resolvida/);
  const dynamic = fixture();
  dynamic['functions/orders/index.js'] = 'require(process.env.HELPER);';
  assert.throws(() => selectFunctions(fixture(), dynamic), /Import dinâmico/);
});
test('failed prior deployments remain pending relative to deployed snapshot', () => {
  const deployed = fixture();
  const failedPush = { ...deployed, 'functions/orders/index.js': 'module.exports = { updated: true };' };
  const testOnlyFollowup = { ...failedPush, 'tests/unit/example.test.ts': 'fixed test' };
  assert.deepEqual(selectFunctions(deployed, testOnlyFollowup).targets, orderNames);
});

const lazyFixture = () => ({
  ...fixture(),
  'functions/index.js': `require('./bootstrap');
function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }
expose('createOrder', () => require('./orders').createOrder);
expose('updateOrder', () => require('./orders').updateOrder);
expose('createUser', () => require('./users').createUser);
expose('getPublicCatalogProducts', () => require('./orders/catalog').getPublicCatalogProducts);
expose('tracking', () => require('./orders/tracking').tracking);
if (process.env.GCLOUD_PROJECT === 'luisices-dev') { expose('sandbox', () => require('./orders/superfrete').sandbox); }`,
  'functions/orders/superfrete.js': "require('../common/auth'); module.exports = {};",
  'functions/orders/catalog.js': 'module.exports = {};',
  'functions/orders/tracking.js': "require('../common/auth'); module.exports = {};",
});

test('migration to lazy exports preserves all endpoints including sandbox', () => {
  const plan = selectFunctions(fixture(), lazyFixture());
  assert.deepEqual(plan.targets, allLazyNames);
  assert.deepEqual(plan.removed, []);
  const rollbackPlan = selectFunctions(lazyFixture(), fixture());
  assert.deepEqual(rollbackPlan.removed, ['getPublicCatalogProducts', 'tracking'].sort());
  assert.deepEqual(rollbackPlan.targets, allNames);
});
test('lazy imports retain selective deploy and shared bootstrap dependencies', () => {
  assert.deepEqual(selectFunctions(lazyFixture(), lazyFixture()).targets, []);
  for (const [file, expected] of [
    ['functions/orders/index.js', coreOrderNames],
    ['functions/orders/catalog.js', ['getPublicCatalogProducts']],
    ['functions/orders/tracking.js', ['tracking']],
    ['functions/orders/superfrete.js', ['sandbox']],
    ['functions/common/payment.js', coreOrderNames],
    ['functions/common/auth.js', [...allNames, 'tracking'].sort()],
    ['functions/bootstrap.js', allLazyNames],
  ]) {
    const after = lazyFixture();
    after[file] += '\n// changed';
    assert.deepEqual(selectFunctions(lazyFixture(), after).targets, expected);
  }
});
test('production env filters out dev-only endpoints', () => {
  const prodFixture = () => ({
    ...lazyFixture(),
    'functions/index.js': `require('./bootstrap');
function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }
expose('createOrder', () => require('./orders').createOrder);
expose('calculateSuperfreteShipping', () => require('./orders/superfrete').calculateSuperfreteShipping);
expose('createUser', () => require('./users').createUser);`,
  });
  const plan = selectFunctions({}, prodFixture(), { env: 'prod' });
  assert.ok(!plan.targets.includes('calculateSuperfreteShipping'));
  assert.deepEqual(plan.targets, ['createOrder', 'createUser']);
});

test('Catálogo público e Superfrete Sandbox têm grafos independentes das mutations', () => {
  const before = lazyFixture();
  const catalogChange = lazyFixture();
  catalogChange['functions/orders/catalog.js'] += '\n// changed public catalog';
  assert.deepEqual(selectFunctions(before, catalogChange).targets, ['getPublicCatalogProducts']);

  const superfreteChange = lazyFixture();
  superfreteChange['functions/orders/superfrete.js'] += '\n// changed sandbox integration';
  assert.deepEqual(selectFunctions(before, superfreteChange).targets, ['sandbox']);

  const ordersChange = lazyFixture();
  ordersChange['functions/orders/index.js'] += '\n// changed transactional order service';
  assert.deepEqual(selectFunctions(before, ordersChange).targets, coreOrderNames);
});

test('tracking change selects its own callable group only', () => {
  const before = lazyFixture();
  const after = lazyFixture();
  after['functions/orders/tracking.js'] += '\n// changed tracking token lifecycle';
  assert.deepEqual(selectFunctions(before, after).targets, ['tracking']);
});

test('registerDeviceSession tem entrada isolada e alterações no core selecionam só essa callable', () => {
  const fixture = () => ({
    'functions/index.js': `require('./bootstrap');
function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }
expose('createUser', () => require('./users').createUser);
expose('registerDeviceSession', () => require('./users/registerDeviceSession').registerDeviceSession);`,
    'functions/users/index.js': "require('../common/auth'); module.exports = {};",
    'functions/users/registerDeviceSession.js': "require('firebase-admin/firestore'); require('../common/sentryFunctions'); require('./registerDeviceSessionCore'); module.exports = {};",
    'functions/users/registerDeviceSessionCore.js': "require('firebase-functions/v2/https'); module.exports = {};",
    'functions/common/auth.js': 'module.exports = {};',
    'functions/common/sentryFunctions.js': 'module.exports = {};',
    'functions/bootstrap.js': 'module.exports = {};',
    'functions/package.json': '{"engines":{"node":"22"}}',
    'functions/package-lock.json': '{}',
    'firebase.json': '{"functions":{"runtime":"nodejs22"}}',
  });

  const before = fixture();
  const after = fixture();
  after['functions/users/registerDeviceSessionCore.js'] += '\n// changed session validation';
  assert.deepEqual(selectFunctions(before, after).targets, ['registerDeviceSession']);

  const entryChange = fixture();
  entryChange['functions/users/registerDeviceSession.js'] += '\n// changed callable configuration';
  assert.deepEqual(selectFunctions(before, entryChange).targets, ['registerDeviceSession']);
});

test('validateUserInvitation tem entrada isolada e alteração no core seleciona só essa callable', () => {
  const fixture = () => ({
    ...lazyFixture(),
    'functions/index.js': `require('./bootstrap');
function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }
expose('createUser', () => require('./users').createUser);
expose('validateUserInvitation', () => require('./users/validateUserInvitation').validateUserInvitation);`,
    'functions/users/validateUserInvitation.js': "require('../common/sentryFunctions'); require('./validateUserInvitationCore'); module.exports = {};",
    'functions/users/validateUserInvitationCore.js': 'module.exports = {};',
    'functions/common/sentryFunctions.js': 'module.exports = {};',
  });

  const before = fixture();
  const after = fixture();
  after['functions/users/validateUserInvitationCore.js'] += '\n// changed invitation validation';
  assert.deepEqual(selectFunctions(before, after).targets, ['validateUserInvitation']);

  const entryChange = fixture();
  entryChange['functions/users/validateUserInvitation.js'] += '\n// changed callable configuration';
  assert.deepEqual(selectFunctions(before, entryChange).targets, ['validateUserInvitation']);
});

test('completeUserInvitation tem entrada isolada e core transacional compartilhado seleciona consumidores de convites', () => {
  const fixture = () => ({
    'functions/index.js': `require('./bootstrap');
function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }
expose('createUserInvitation', () => require('./users/createUserInvitation').createUserInvitation);
expose('completeUserInvitation', () => require('./users/completeUserInvitation').completeUserInvitation);`,
    'functions/users/index.js': "require('./userAdminActions'); require('./userAudit'); require('../common/secrets'); module.exports = {};",
    'functions/users/createUserInvitation.js': "require('./invitationActivation'); require('./createUserInvitationCore'); require('./userAdminActions'); require('./userAudit'); module.exports = {};",
    'functions/users/createUserInvitationCore.js': 'module.exports = {};',
    'functions/users/userAdminActions.js': "require('../common/rateLimiters'); module.exports = {};",
    'functions/users/userAudit.js': 'module.exports = {};',
    'functions/users/invitationActivation.js': "require('./invitationActivationCore'); require('./invitedUserPermissions'); module.exports = {};",
    'functions/users/invitedUserPermissions.js': 'module.exports = {};',
    'functions/users/invitationActivationCore.js': 'module.exports = {};',
    'functions/users/completeUserInvitation.js': "require('./invitationActivation'); require('./completeUserInvitationCore'); module.exports = {};",
    'functions/users/completeUserInvitationCore.js': 'module.exports = {};',
    'functions/common/secrets.js': 'module.exports = {};',
    'functions/common/rateLimiters.js': 'module.exports = {};',
    'functions/bootstrap.js': 'module.exports = {};',
    'functions/package.json': '{"engines":{"node":"22"}}',
    'functions/package-lock.json': '{}',
    'firebase.json': '{"functions":{"runtime":"nodejs22"}}',
  });

  const before = fixture();
  const completionCoreChange = fixture();
  completionCoreChange['functions/users/completeUserInvitationCore.js'] += '\n// changed orchestration';
  assert.deepEqual(selectFunctions(before, completionCoreChange).targets, ['completeUserInvitation']);

  const createCoreChange = fixture();
  createCoreChange['functions/users/createUserInvitationCore.js'] += '\n// changed invitation creation';
  assert.deepEqual(selectFunctions(before, createCoreChange).targets, ['createUserInvitation']);

  const entryChange = fixture();
  entryChange['functions/users/completeUserInvitation.js'] += '\n// changed callable configuration';
  assert.deepEqual(selectFunctions(before, entryChange).targets, ['completeUserInvitation']);

  const sharedActivationChange = fixture();
  sharedActivationChange['functions/users/invitationActivationCore.js'] += '\n// changed shared transaction';
  assert.deepEqual(selectFunctions(before, sharedActivationChange).targets,
    ['completeUserInvitation', 'createUserInvitation']);
});

test('handlers de e-mail têm deploys independentes por fluxo', () => {
  const fixture = {
    'functions/index.js': `require('./bootstrap');
function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }
expose('sendCustomEmail', () => require('./email/send').sendCustomEmail);
expose('getEmailUsage', () => require('./email/usage').getEmailUsage);
expose('resendReceivingWebhook', () => require('./email/webhook').resendReceivingWebhook);
expose('cleanupEmailDrafts', () => require('./email/cleanup').cleanupEmailDrafts);`,
    'functions/email/send.js': "require('./attachments'); module.exports = {};",
    'functions/email/webhook.js': "require('./spamFilter'); require('./webhookSecurity'); module.exports = {};",
    'functions/email/cleanup.js': "require('./cleanupCore'); module.exports = {};",
    'functions/email/attachments.js': 'module.exports = {};',
    'functions/email/spamFilter.js': 'module.exports = {};',
    'functions/email/webhookSecurity.js': 'module.exports = {};',
    'functions/email/cleanupCore.js': 'module.exports = {};',
    'functions/email/usage.js': 'module.exports = {};',
    'functions/bootstrap.js': 'module.exports = {};',
  };
  for (const [file, expected] of [
    ['functions/email/send.js', ['sendCustomEmail']],
    ['functions/email/usage.js', ['getEmailUsage']],
    ['functions/email/webhook.js', ['resendReceivingWebhook']],
    ['functions/email/webhookSecurity.js', ['resendReceivingWebhook']],
    ['functions/email/cleanup.js', ['cleanupEmailDrafts']],
  ]) {
    const changed = { ...fixture, [file]: `${fixture[file]}\n// changed` };
    assert.deepEqual(selectFunctions(fixture, changed).targets, expected);
  }
});

test('webhook, status e operações do WhatsApp têm deploys independentes', () => {
  const fixture = {
    'functions/index.js': `require('./bootstrap');
function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }
expose('sendWhatsAppDirectMessage', () => require('./whatsapp/send').sendWhatsAppDirectMessage);
expose('deleteWhatsAppMessage', () => require('./whatsapp/delete').deleteWhatsAppMessage);
expose('syncWhatsAppChatMessages', () => require('./whatsapp/sync').syncWhatsAppChatMessages);
expose('getWhatsAppInstanceStatus', () => require('./whatsapp/status').getWhatsAppInstanceStatus);
expose('markWhatsAppChatRead', () => require('./whatsapp/conversations').markWhatsAppChatRead);
expose('ensureWhatsAppConversation', () => require('./whatsapp/conversations').ensureWhatsAppConversation);
expose('evolutionWhatsAppWebhook', () => require('./whatsapp/webhook').evolutionWhatsAppWebhook);`,
    'functions/whatsapp/send.js': "require('./authorization'); require('./chatScope'); require('../common/helpers'); require('../common/rateLimiters'); require('../common/secrets'); require('../common/sentry'); require('../common/sentryFunctions'); module.exports = {};",
    'functions/whatsapp/delete.js': "require('./authorization'); require('./chatScope'); require('../common/helpers'); require('../common/secrets'); require('../common/sentry'); require('../common/sentryFunctions'); module.exports = {};",
    'functions/whatsapp/sync.js': "require('./authorization'); require('./chatScope'); require('./syncCore'); require('../common/helpers'); require('../common/secrets'); require('../common/sentry'); require('../common/sentryFunctions'); module.exports = {};",
    'functions/whatsapp/syncCore.js': "require('firebase-functions/v2/https'); module.exports = {};",
    'functions/whatsapp/authorization.js': "require('../common/helpers'); module.exports = {};",
    'functions/whatsapp/status.js': "require('./authorization'); require('./statusCore'); module.exports = {};",
    'functions/whatsapp/statusCore.js': 'module.exports = {};',
    'functions/whatsapp/conversations.js': "require('./authorization'); require('./chatScope'); require('./conversationCore'); module.exports = {};",
    'functions/whatsapp/chatScope.js': "require('../common/helpers'); module.exports = {};",
    'functions/whatsapp/conversationCore.js': 'module.exports = {};',
    'functions/whatsapp/webhook.js': "require('./persistMessage'); module.exports = {};",
    'functions/whatsapp/persistMessage.js': 'module.exports = {};',
    'functions/common/helpers.js': 'module.exports = {};',
    'functions/common/rateLimiters.js': 'module.exports = {};',
    'functions/common/secrets.js': 'module.exports = {};',
    'functions/common/sentry.js': 'module.exports = {};',
    'functions/common/sentryFunctions.js': 'module.exports = {};',
    'functions/bootstrap.js': 'module.exports = {};',
  };
  for (const [file, expected] of [
    ['functions/whatsapp/send.js', ['sendWhatsAppDirectMessage']],
    ['functions/common/rateLimiters.js', ['sendWhatsAppDirectMessage']],
    ['functions/whatsapp/delete.js', ['deleteWhatsAppMessage']],
    ['functions/whatsapp/sync.js', ['syncWhatsAppChatMessages']],
    ['functions/whatsapp/syncCore.js', ['syncWhatsAppChatMessages']],
    ['functions/whatsapp/status.js', ['getWhatsAppInstanceStatus']],
    ['functions/whatsapp/statusCore.js', ['getWhatsAppInstanceStatus']],
    ['functions/whatsapp/conversations.js', ['ensureWhatsAppConversation', 'markWhatsAppChatRead']],
    ['functions/whatsapp/chatScope.js', ['deleteWhatsAppMessage', 'ensureWhatsAppConversation', 'markWhatsAppChatRead', 'sendWhatsAppDirectMessage', 'syncWhatsAppChatMessages']],
    ['functions/whatsapp/conversationCore.js', ['ensureWhatsAppConversation', 'markWhatsAppChatRead']],
    ['functions/whatsapp/authorization.js', ['deleteWhatsAppMessage', 'ensureWhatsAppConversation', 'getWhatsAppInstanceStatus', 'markWhatsAppChatRead', 'sendWhatsAppDirectMessage', 'syncWhatsAppChatMessages']],
    ['functions/whatsapp/webhook.js', ['evolutionWhatsAppWebhook']],
    ['functions/whatsapp/persistMessage.js', ['evolutionWhatsAppWebhook']],
  ]) {
    const changed = { ...fixture, [file]: `${fixture[file]}\n// changed` };
    assert.deepEqual(selectFunctions(fixture, changed).targets, expected);
  }
});

test('adding a new expose entry to index.js only selects new/changed endpoint', () => {
  const before = lazyFixture();
  const after = lazyFixture();
  after['functions/index.js'] += "\nexpose('extra', () => require('./orders').extra);";
  const plan = selectFunctions(before, after);
  assert.deepEqual(plan.targets, ['extra']);
});

const mcpFixture = () => {
  const callableNames = [
    'getMcpSettingsStatus', 'createMcpApiKey', 'updateMcpApiKeyScopes',
    'toggleMcpApiKey', 'revokeMcpApiKey', 'toggleGlobalMcp',
    'setUserMcpEligibility', 'revokeMcpSession', 'getMcpAuditLogs',
    'getMcpOpenApiSchema',
  ];
  return {
    'functions/index.js': [
      "require('./bootstrap');",
      'function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }',
      ...callableNames.map((name) => `expose('${name}', () => require('./mcp/callables').${name});`),
      "expose('chatGptToolsEndpoint', () => require('./mcp/endpoint').chatGptToolsEndpoint);",
    ].join('\n'),
    'functions/bootstrap.js': 'module.exports = {};',
    'functions/mcp/callables.js': "require('./constants'); module.exports = {};",
    'functions/mcp/endpoint.js': "require('./constants'); require('./aiServices'); module.exports = {};",
    'functions/mcp/aiServices.js': "require('../ai/repositories'); require('../ai/tools'); module.exports = {};",
    'functions/ai/repositories.js': "require('./authorization'); module.exports = {};",
    'functions/ai/tools.js': "require('./config'); require('./pricing/pricingCalculator'); require('./authorization'); module.exports = {};",
    'functions/ai/config.js': 'module.exports = {};',
    'functions/ai/authorization.js': 'module.exports = {};',
    'functions/ai/pricing/pricingCalculator.js': 'module.exports = {};',
    'functions/mcp/index.js': "require('./callables'); require('./endpoint'); module.exports = {};",
    'functions/mcp/constants.js': 'module.exports = {};',
    'functions/ai/index.js': 'module.exports = {};',
    'functions/package.json': '{"engines":{"node":"22"}}',
    'functions/package-lock.json': '{}',
    'firebase.json': '{"functions":{"runtime":"nodejs22"}}',
  };
};
const mcpCallableNames = [
  'createMcpApiKey', 'getMcpAuditLogs', 'getMcpOpenApiSchema',
  'getMcpSettingsStatus', 'revokeMcpApiKey', 'revokeMcpSession',
  'setUserMcpEligibility', 'toggleGlobalMcp', 'toggleMcpApiKey',
  'updateMcpApiKeyScopes',
];
const mcpEndpointName = ['chatGptToolsEndpoint'];

const mcpAggregateFixture = () => {
  const fixture = mcpFixture();
  const names = [...mcpCallableNames, ...mcpEndpointName];
  fixture['functions/index.js'] = [
    "require('./bootstrap');",
    'function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }',
    ...names.map((name) => `expose('${name}', () => require('./mcp').${name});`),
  ].join('\n');
  return fixture;
};

test('MCP endpoint and admin callables have independent deploy graphs', () => {
  const before = mcpFixture();
  const callableChange = mcpFixture();
  callableChange['functions/mcp/callables.js'] += '\n// changed admin callable';
  assert.deepEqual(selectFunctions(before, callableChange).targets, mcpCallableNames);

  const endpointChange = mcpFixture();
  endpointChange['functions/mcp/endpoint.js'] += '\n// changed MCP protocol endpoint';
  assert.deepEqual(selectFunctions(before, endpointChange).targets, mcpEndpointName);
});

test('MCP dependency shared by endpoint and callables selects both groups', () => {
  const before = mcpFixture();
  const after = mcpFixture();
  after['functions/mcp/constants.js'] += '\n// shared MCP contract changed';
  assert.deepEqual(selectFunctions(before, after).targets, [...mcpCallableNames, ...mcpEndpointName].sort());
});

test('removing the obsolete MCP aggregate remains fail-closed for that deploy', () => {
  const before = mcpFixture();
  const after = mcpFixture();
  delete after['functions/mcp/index.js'];
  assert.deepEqual(selectFunctions(before, after).targets, [...mcpCallableNames, ...mcpEndpointName].sort());
});

test('removing a formerly reachable aggregate selects only its remapped endpoints', () => {
  const before = mcpAggregateFixture();
  const after = mcpFixture();
  delete after['functions/mcp/index.js'];
  assert.deepEqual(selectFunctions(before, after).targets, [...mcpCallableNames, ...mcpEndpointName].sort());
});

const aiFixture = () => ({
  'functions/index.js': [
    "require('./bootstrap');",
    'function expose(name, load) { Object.defineProperty(module.exports, name, { enumerable: true, get: load }); }',
    "expose('aiAgentChat', () => require('./ai/callables').aiAgentChat);",
    "expose('enrichGalleryItemWithAi', () => require('./ai/enrichmentCallables').enrichGalleryItemWithAi);",
    "expose('enrichStoreProductWithAi', () => require('./ai/enrichmentCallables').enrichStoreProductWithAi);",
    "expose('getAiUsage', () => require('./ai/usageCallable').getAiUsage);",
    "expose('chatGptToolsEndpoint', () => require('./mcp/endpoint').chatGptToolsEndpoint);",
  ].join('\n'),
  'functions/bootstrap.js': 'module.exports = {};',
  'functions/ai/callables.js': "require('./index'); require('./httpsError'); module.exports = {};",
  'functions/ai/enrichmentCallables.js': "require('./enrichmentServices'); require('./httpsError'); module.exports = {};",
  'functions/ai/enrichmentServices.js': "require('./config'); require('./budget'); require('./geminiClient'); require('./handlers'); module.exports = {};",
  'functions/ai/config.js': 'module.exports = {};',
  'functions/ai/budget.js': 'module.exports = {};',
  'functions/ai/usageCallable.js': "require('./usageHandler'); require('./httpsError'); module.exports = {};",
  'functions/ai/usageHandler.js': "require('./authorization'); require('./usage'); module.exports = {};",
  'functions/ai/authorization.js': 'module.exports = {};',
  'functions/ai/usage.js': 'module.exports = {};',
  'functions/ai/httpsError.js': 'module.exports = {};',
  'functions/ai/index.js': "require('./handlers'); require('./geminiClient'); require('./tools'); require('./repositories'); module.exports = {};",
  'functions/ai/handlers.js': 'module.exports = {};',
  'functions/ai/geminiClient.js': 'module.exports = {};',
  'functions/ai/tools.js': 'module.exports = {};',
  'functions/mcp/endpoint.js': "require('./aiServices'); module.exports = {};",
  'functions/mcp/aiServices.js': "require('../ai/tools'); require('../ai/repositories'); module.exports = {};",
  'functions/ai/repositories.js': 'module.exports = {};',
  'functions/package.json': '{"engines":{"node":"22"}}',
  'functions/package-lock.json': '{}',
  'firebase.json': '{"functions":{"runtime":"nodejs22"}}',
});

test('getAiUsage tem grafo independente da fábrica de chat e Gemini', () => {
  const before = aiFixture();
  const after = aiFixture();
  after['functions/ai/usageHandler.js'] += '\n// change historical usage handler';
  assert.deepEqual(selectFunctions(before, after).targets, ['getAiUsage']);

  const aiCoreChange = aiFixture();
  aiCoreChange['functions/ai/index.js'] += '\n// chat and enrichment services changed';
  assert.deepEqual(selectFunctions(before, aiCoreChange).targets, [
    'aiAgentChat',
  ]);
});

test('MCP service factory excludes changes exclusive to the Gemini factory', () => {
  const before = aiFixture();
  const after = aiFixture();
  after['functions/ai/geminiClient.js'] += '\n// Gemini transport changed';
  assert.deepEqual(selectFunctions(before, after).targets, [
    'aiAgentChat', 'enrichGalleryItemWithAi', 'enrichStoreProductWithAi',
  ]);
});

test('fábrica e handlers de enrichment não republicam chat ou endpoint MCP', () => {
  const before = aiFixture();
  const after = aiFixture();
  after['functions/ai/enrichmentServices.js'] += '\n// vision service changed';
  assert.deepEqual(selectFunctions(before, after).targets, [
    'enrichGalleryItemWithAi', 'enrichStoreProductWithAi',
  ]);

  const chatOnlyChange = aiFixture();
  chatOnlyChange['functions/ai/callables.js'] += '\n// chat callable changed';
  assert.deepEqual(selectFunctions(before, chatOnlyChange).targets, ['aiAgentChat']);
});

