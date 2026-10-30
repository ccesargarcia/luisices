import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { canReuseE2E, canReusePromotionE2E } = require('../../scripts/reuse-verified-promotion-e2e.cjs');

const mainSha = 'a'.repeat(40);
const developSha = 'b'.repeat(40);
const promotionSha = 'c'.repeat(40);
const mergeTreeSha = 'd'.repeat(40);

function setup(overrides = {}) {
  const calls = [];
  const github = {
    rest: {
      git: {
        getRef: async ({ ref }) => ({ data: { object: { sha: ref === 'heads/main' ? mainSha : developSha } } }),
      },
      repos: {
        getCommit: async () => ({
          data: {
            parents: [{ sha: mainSha }, { sha: developSha }],
            commit: { tree: { sha: mergeTreeSha } },
          },
        }),
      },
      actions: {
        listWorkflowRuns: async ({ workflow_id, branch }) => {
          calls.push({ workflow_id, branch });
          return {
            data: {
              workflow_runs: [{
                head_sha: branch === 'main' ? mainSha : developSha,
                event: 'push',
                conclusion: 'success',
              }],
            },
          };
        },
      },
    },
  };
  const pullRequest = {
    base: { ref: 'main', sha: mainSha },
    head: { ref: 'release/sync-develop-main', sha: promotionSha },
  };
  return {
    calls,
    input: {
      github,
      repo: { owner: 'example', repo: 'project' },
      pullRequest,
      mergeTree: () => mergeTreeSha,
      ...overrides,
    },
  };
}

test('reuses E2E only for an exact merge with successful dev and production deployments', async () => {
  const { input, calls } = setup();
  const result = await canReusePromotionE2E(input);

  assert.equal(result.reuse, true);
  assert.deepEqual(calls, [
    { workflow_id: 'deploy-dev.yml', branch: 'develop' },
    { workflow_id: 'deploy-production.yml', branch: 'main' },
  ]);
});

test('does not reuse tests for non-promotion pull requests', async () => {
  const { input, calls } = setup();
  input.pullRequest.base.ref = 'develop';

  assert.equal((await canReusePromotionE2E(input)).reuse, false);
  assert.deepEqual(calls, []);
});

test('falls back to E2E when the promotion base moved', async () => {
  const { input } = setup();
  input.pullRequest.base.sha = 'e'.repeat(40);

  assert.equal((await canReusePromotionE2E(input)).reuse, false);
});

test('falls back when the promotion commit has extra parents or a different merge tree', async () => {
  const extraParent = setup();
  extraParent.input.github.rest.repos.getCommit = async () => ({
    data: {
      parents: [{ sha: mainSha }, { sha: developSha }, { sha: 'e'.repeat(40) }],
      commit: { tree: { sha: mergeTreeSha } },
    },
  });
  assert.equal((await canReusePromotionE2E(extraParent.input)).reuse, false);

  const differentTree = setup({ mergeTree: () => 'e'.repeat(40) });
  assert.equal((await canReusePromotionE2E(differentTree.input)).reuse, false);
});

test('falls back when either branch lacks a successful deployment for its exact SHA', async () => {
  const { input } = setup();
  input.github.rest.actions.listWorkflowRuns = async ({ branch }) => ({
    data: { workflow_runs: [{
      head_sha: branch === 'main' ? mainSha : developSha,
      event: 'push',
      conclusion: branch === 'main' ? 'success' : 'failure',
    }] },
  });

  assert.equal((await canReusePromotionE2E(input)).reuse, false);
});

test('fails safe and runs E2E if GitHub verification is unavailable', async () => {
  const { input } = setup();
  input.github.rest.git.getRef = async () => { throw new Error('API unavailable'); };

  const result = await canReusePromotionE2E(input);
  assert.equal(result.reuse, false);
  assert.match(result.reason, /verification failed safely/);
});

function pushSetup() {
  const mergedSha = 'f'.repeat(40);
  const testedSha = '1'.repeat(40);
  const github = {
    rest: {
      repos: {
        listPullRequestsAssociatedWithCommit: async () => ({
          data: [{
            number: 132,
            merged_at: '2026-10-30T21:52:03Z',
            merge_commit_sha: mergedSha,
            base: { ref: 'develop' },
            head: { sha: testedSha },
          }],
        }),
        getCommit: async ({ ref }) => ({
          data: { commit: { tree: { sha: ref === mergedSha ? mergeTreeSha : mergeTreeSha } } },
        }),
      },
      checks: {
        listForRef: async () => ({
          data: {
            check_runs: [
              { name: 'e2e-tests (1)', status: 'completed', conclusion: 'success', details_url: 'https://github.com/example/project/actions/runs/123/job/1' },
              { name: 'e2e-tests (2)', status: 'completed', conclusion: 'success', details_url: 'https://github.com/example/project/actions/runs/123/job/2' },
            ],
          },
        }),
      },
      actions: {
        listRepoWorkflows: async () => ({
          data: { workflows: [{ id: 77, path: '.github/workflows/test-actions.yml' }] },
        }),
        getWorkflowRun: async () => ({
          data: {
            workflow_id: 77,
            event: 'pull_request',
            status: 'completed',
            conclusion: 'success',
            head_sha: testedSha,
            pull_requests: [],
          },
        }),
      },
    },
  };

  return {
    github,
    repo: { owner: 'example', repo: 'project' },
    context: { eventName: 'push', ref: 'refs/heads/develop', sha: mergedSha },
  };
}

test('reuses E2E after develop merge when the PR tree and both checks are verified', async () => {
  const result = await canReuseE2E(pushSetup());

  assert.equal(result.reuse, true);
  assert.match(result.reason, /PR #132/);
});

test('does not require workflowRun.pull_requests when reusing checks after develop merge', async () => {
  const input = pushSetup();
  input.github.rest.actions.getWorkflowRun = async () => ({
    data: {
      workflow_id: 77,
      event: 'pull_request',
      status: 'completed',
      conclusion: 'success',
      head_sha: '1'.repeat(40),
    },
  });

  assert.equal((await canReuseE2E(input)).reuse, true);
});

test('reruns E2E on a direct develop push without a matching merged PR', async () => {
  const input = pushSetup();
  input.github.rest.repos.listPullRequestsAssociatedWithCommit = async () => ({ data: [] });

  assert.equal((await canReuseE2E(input)).reuse, false);
});
