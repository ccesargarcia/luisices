export const BETA_ONLY_NO_DEV_DEPLOY_LABEL = 'beta-only-no-dev-deploy';

/**
 * Skip all automatic Dev publications for explicitly Beta-only merged PRs.
 * Validation jobs remain governed by the normal changed-file policy.
 */
export function shouldSkipDevDeploy({ eventName, ref, pullRequests = [] }) {
  if (eventName !== 'push' || ref !== 'refs/heads/develop') return false;

  return pullRequests.some((pullRequest) => (
    Boolean(pullRequest.merged_at)
    && (pullRequest.labels || []).some((label) => (
      String(label?.name || '').toLowerCase() === BETA_ONLY_NO_DEV_DEPLOY_LABEL
    ))
  ));
}
