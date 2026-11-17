import { describe, expect, it } from 'vitest';
import { shouldSkipDevDeploy } from '../../scripts/dev-deploy-policy.mjs';

const betaOnlyMergedPullRequest = {
  merged_at: '2026-11-17T02:23:36Z',
  labels: [{ name: 'beta-only-no-dev-deploy' }],
};

describe('política de deploy Dev para PRs Beta-only', () => {
  it('pula publicações Dev para PR Beta-only integrada em develop', () => {
    expect(shouldSkipDevDeploy({
      eventName: 'push',
      ref: 'refs/heads/develop',
      pullRequests: [betaOnlyMergedPullRequest],
    })).toBe(true);
  });

  it('mantém deploy normal para PR integrada sem o marcador', () => {
    expect(shouldSkipDevDeploy({
      eventName: 'push',
      ref: 'refs/heads/develop',
      pullRequests: [{ merged_at: '2026-11-17T02:23:36Z', labels: [{ name: 'feature' }] }],
    })).toBe(false);
  });

  it('não pula deploy quando a PR ainda não foi integrada', () => {
    expect(shouldSkipDevDeploy({
      eventName: 'push',
      ref: 'refs/heads/develop',
      pullRequests: [{ ...betaOnlyMergedPullRequest, merged_at: null }],
    })).toBe(false);
  });

  it('não aplica a política a dispatch manual nem a outra branch', () => {
    expect(shouldSkipDevDeploy({
      eventName: 'workflow_dispatch',
      ref: 'refs/heads/develop',
      pullRequests: [betaOnlyMergedPullRequest],
    })).toBe(false);
    expect(shouldSkipDevDeploy({
      eventName: 'push',
      ref: 'refs/heads/main',
      pullRequests: [betaOnlyMergedPullRequest],
    })).toBe(false);
  });

  it('mantém deploy normal quando o push não está associado a uma PR', () => {
    expect(shouldSkipDevDeploy({
      eventName: 'push',
      ref: 'refs/heads/develop',
    })).toBe(false);
  });
});
