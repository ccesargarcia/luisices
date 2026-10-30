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

test('main promotion reuses tests only after exact main/develop deployments were verified', async () => {
  const tests = await workflow('test-actions.yml');
  const verify = tests.jobs['verify-promotion'];
  const e2e = tests.jobs['e2e-tests'];
  const trends = tests.jobs['test-trends'];

  assert.match(verify.if, /github\.workflow == 'E2E Tests'/);
  assert.match(verify.if, /base\.ref == 'main'/);
  assert.match(verify.if, /head\.ref == 'release\/sync-develop-main'/);
  assert.match(verify.if, /event_name == 'push'.*ref == 'refs\/heads\/develop'/);
  assert.deepEqual(verify.permissions, {
    actions: 'read',
    checks: 'read',
    contents: 'read',
    'pull-requests': 'read',
  });
  assert.equal(verify.outputs.reuse_e2e, '${{ steps.verify.outputs.reuse_e2e }}');
  assert.equal(e2e.needs, 'verify-promotion');
  assert.match(e2e.if, /always\(\)/);
  assert.match(e2e.if, /needs\.verify-promotion\.outputs\.reuse_e2e != 'true'/);
  assert.ok(trends.needs.includes('verify-promotion'));
  assert.match(trends.if, /reuse_e2e != 'true'/);
});

test('Functions deployment fetches the previous deployment commit before calculating its delta', async () => {
  const functions = await workflow('deploy-functions-manual.yml');
  const steps = functions.jobs['deploy-functions'].steps;
  const fetchBase = steps.findIndex(step => step.name === 'Buscar commit-base do seletor de Functions');
  const selectFunctions = steps.findIndex(step => step.name === 'Selecionar Functions por dependências desde a última publicação');

  assert.ok(fetchBase >= 0, 'expected the shallow checkout baseline fetch step');
  assert.ok(fetchBase < selectFunctions, 'baseline must be fetched before git ls-tree runs');
  assert.equal(steps[fetchBase].env.FUNCTIONS_BASE_SHA, '${{ steps.functions_base.outputs.sha }}');
  assert.match(steps[fetchBase].run, /git cat-file -e/);
  assert.match(steps[fetchBase].run, /git fetch --no-tags --depth=1 origin/);
  assert.match(steps[fetchBase].run, /git fetch --no-tags origin main/);
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

test('dev caller grants the read permissions required by the reusable E2E verifier', async () => {
  const dev = await workflow('deploy-dev.yml');

  assert.deepEqual(dev.jobs['e2e-tests'].permissions, {
    actions: 'read',
    checks: 'read',
    contents: 'read',
    'pull-requests': 'read',
  });
});

test('dev deployment reuses successful E2E checks from the merged PR and fails safe without them', async () => {
  const dev = await workflow('deploy-dev.yml');
  const detect = dev.jobs['detect-changes'];
  const checksStep = detect.steps.find(step => step.name === 'Reutilizar E2E aprovados da PR mesclada');
  const resolveStep = detect.steps.find(step => step.name === 'Resolver Alvos e Estratégia de Testes');

  assert.ok(checksStep, 'expected merged pull request checks to be reused');
  assert.equal(detect.permissions['pull-requests'], 'read');
  assert.equal(detect.permissions.checks, 'read');
  assert.match(checksStep.with.script, /listPullRequestsAssociatedWithCommit/);
  assert.match(checksStep.with.script, /merge_commit_sha === context\.sha/);
  assert.match(checksStep.with.script, /getCommit\([\s\S]*mergedPr\.head\.sha/);
  assert.match(checksStep.with.script, /commit\.tree\.sha !== testedCommit\.data\.commit\.tree\.sha/);
  assert.match(checksStep.with.script, /filter: 'latest'/);
  assert.match(checksStep.with.script, /\['e2e-tests \(1\)', 'e2e-tests \(2\)'\]/);
  assert.match(checksStep.with.script, /detailsUrl\.match\(\/\\\/actions\\\/runs\\\/\(\\d\+\)\\\//);
  assert.match(checksStep.with.script, /workflow\.path === '\.github\/workflows\/test-actions\.yml'/);
  assert.match(checksStep.with.script, /workflowRun\.event !== 'pull_request'/);
  assert.match(checksStep.with.script, /workflowRun\.head_sha !== mergedPr\.head\.sha/);
  assert.doesNotMatch(checksStep.with.script, /workflowRun\.pull_requests/);
  assert.match(checksStep.with.script, /core\.setOutput\('verified', 'false'\)/);
  assert.match(checksStep.with.script, /core\.setOutput\('verified', 'true'\)/);
  assert.match(checksStep.with.script, /mantendo os testes neste push/);
  assert.equal(resolveStep.env.MERGED_PR_E2E_VERIFIED, '${{ steps.pr_checks.outputs.verified }}');
  assert.match(resolveStep.run, /MERGED_PR_E2E_VERIFIED.*true/);
});

test('dev deployment falls back to an older Functions baseline when GitHub API history is unavailable', async () => {
  const dev = await workflow('deploy-dev.yml');
  const baselineStep = dev.jobs['detect-changes'].steps.find(step =>
    step.name === 'Localizar última publicação bem-sucedida das Functions');

  assert.ok(baselineStep, 'expected the Functions baseline lookup step');
  assert.match(baselineStep.with.script, /try\s*\{[\s\S]*github\.paginate[\s\S]*catch\s*\(error\)/);
  assert.match(baselineStep.with.script, /core\.warning\([\s\S]*\);\s*continue;/);
  assert.match(baselineStep.with.script, /core\.setOutput\('sha', ''\)/);
});
