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
const allNames = ['createOrder', 'createUser', 'sandbox', 'updateOrder'];

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
if (process.env.GCLOUD_PROJECT === 'luisices-dev') { expose('sandbox', () => require('./orders').sandbox); }`,
});

test('migration to lazy exports preserves all endpoints including sandbox', () => {
  const plan = selectFunctions(fixture(), lazyFixture());
  assert.deepEqual(plan.targets, allNames);
  assert.deepEqual(plan.removed, []);
  assert.deepEqual(selectFunctions(lazyFixture(), fixture()).removed, []);
});
test('lazy imports retain selective deploy and shared bootstrap dependencies', () => {
  assert.deepEqual(selectFunctions(lazyFixture(), lazyFixture()).targets, []);
  for (const [file, expected] of [
    ['functions/orders/index.js', orderNames],
    ['functions/common/payment.js', orderNames],
    ['functions/common/auth.js', allNames],
    ['functions/bootstrap.js', allNames],
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
expose('calculateSuperfreteShipping', () => require('./orders').calculateSuperfreteShipping);
expose('createUser', () => require('./users').createUser);`,
  });
  const plan = selectFunctions({}, prodFixture(), { env: 'prod' });
  assert.ok(!plan.targets.includes('calculateSuperfreteShipping'));
  assert.deepEqual(plan.targets, ['createOrder', 'createUser']);
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
    'functions/mcp/endpoint.js': "require('./constants'); require('../ai/index'); module.exports = {};",
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

