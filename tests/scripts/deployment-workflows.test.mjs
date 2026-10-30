import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

const workflow = async (name) => parse(await readFile(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8'));

test('production release deploys components in dependency order and serializes releases', async () => {
  const release = await workflow('deploy-production.yml');

  assert.deepEqual(release.on.push.branches, ['main']);
  assert.equal(release.concurrency.group, 'production-release');
  assert.equal(release.concurrency['cancel-in-progress'], false);
  assert.ok((Array.isArray(release.jobs.functions.needs)
    ? release.jobs.functions.needs
    : [release.jobs.functions.needs]).includes('plan'));
  assert.ok(release.jobs.cloudflare.needs.includes('functions'));
  assert.ok(release.jobs['purge-mcp-cache'].needs.includes('cloudflare'));
  assert.ok(release.jobs.frontend.needs.includes('cloudflare'));
  assert.ok(release.jobs.frontend.needs.includes('purge-mcp-cache'));
  assert.ok(release.jobs.rules.needs.includes('frontend'));
  assert.match(release.jobs.rules.name, /last/);
});

test('production deployment entrypoints are reusable, with manual dispatch limited to dev', async () => {
  const functions = await workflow('deploy-functions-manual.yml');
  const cloudflare = await workflow('deploy-cloudflare.yml');
  const pages = await workflow('deploy.yml');
  const indexes = await workflow('deploy-indexes.yml');

  assert.ok(Object.hasOwn(functions.on, 'workflow_call'));
  assert.deepEqual(functions.on.workflow_dispatch.inputs.environment.options, ['dev']);
  assert.ok(Object.hasOwn(cloudflare.on, 'workflow_call'));
  assert.deepEqual(cloudflare.on.workflow_dispatch.inputs.target_environment.options, ['dev']);
  assert.ok(Object.hasOwn(pages.on, 'workflow_call'));
  assert.deepEqual(indexes.on.workflow_dispatch.inputs.environment.options, ['dev']);
});

test('dev deployment publishes indexes before application changes and rules last', async () => {
  const dev = await workflow('deploy-dev.yml');

  assert.ok(dev.jobs.deploy.needs.includes('deploy-indexes'));
  assert.ok(dev.jobs['deploy-frontend'].needs.includes('deploy-indexes'));
  assert.ok(dev.jobs['deploy-frontend'].needs.includes('deploy-cloudflare'));
  assert.ok(dev.jobs['deploy-rules'].needs.includes('deploy-frontend'));
  assert.ok(dev.jobs['deploy-rules'].needs.includes('deploy-cloudflare'));
  assert.ok(dev.jobs['deploy-rules'].needs.includes('purge-mcp-cache'));
  assert.equal(dev.jobs['purge-mcp-cache'].with.target_worker, 'cache');
  assert.ok(dev.jobs['deploy-cloudflare'].needs.includes('cloudflare-validation'));
});
