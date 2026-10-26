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
