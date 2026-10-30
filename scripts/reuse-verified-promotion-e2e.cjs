const { execFileSync } = require('node:child_process');

function getMergeTree(mainSha, developSha) {
  return execFileSync('git', ['merge-tree', '--write-tree', mainSha, developSha], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim().split('\n')[0];
}

async function hasSuccessfulPushRun(github, repo, workflowId, branch, sha) {
  const { data } = await github.rest.actions.listWorkflowRuns({
    ...repo,
    workflow_id: workflowId,
    branch,
    status: 'completed',
    per_page: 100,
  });

  return data.workflow_runs?.some((run) =>
    run.head_sha === sha && run.event === 'push' && run.conclusion === 'success'
  ) || false;
}

async function canReuseMergedPullRequestE2E({ github, repo, sha }) {
  const { data: pullRequests } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
    ...repo,
    commit_sha: sha,
  });
  const mergedPullRequest = pullRequests.find((pullRequest) =>
    pullRequest.merged_at
      && pullRequest.base.ref === 'develop'
      && pullRequest.merge_commit_sha === sha
  );
  if (!mergedPullRequest) {
    return { reuse: false, reason: 'push is not the merge commit of a PR into develop' };
  }

  const [mergeCommit, testedCommit] = await Promise.all([
    github.rest.repos.getCommit({ ...repo, ref: sha }),
    github.rest.repos.getCommit({ ...repo, ref: mergedPullRequest.head.sha }),
  ]);
  if (mergeCommit.data.commit.tree.sha !== testedCommit.data.commit.tree.sha) {
    return { reuse: false, reason: 'develop merge tree differs from the PR tree that was tested' };
  }

  const { data: checkData } = await github.rest.checks.listForRef({
    ...repo,
    ref: mergedPullRequest.head.sha,
    filter: 'latest',
    per_page: 100,
  });
  const requiredChecks = ['e2e-tests (1)', 'e2e-tests (2)'];
  const latestByName = new Map();
  for (const check of checkData.check_runs) {
    if (!latestByName.has(check.name)) latestByName.set(check.name, check);
  }
  if (!requiredChecks.every((name) => {
    const check = latestByName.get(name);
    return check?.status === 'completed' && check.conclusion === 'success';
  })) {
    return { reuse: false, reason: 'the merged PR does not have both required successful E2E checks' };
  }

  const runIds = new Set(requiredChecks.map((name) => {
    const detailsUrl = latestByName.get(name)?.details_url || '';
    return detailsUrl.match(/\/actions\/runs\/(\d+)\//)?.[1] || '';
  }));
  if (runIds.size !== 1 || runIds.has('')) {
    return { reuse: false, reason: 'the required E2E checks do not belong to one workflow run' };
  }

  const [{ data: workflows }, { data: workflowRun }] = await Promise.all([
    github.rest.actions.listRepoWorkflows({ ...repo, per_page: 100 }),
    github.rest.actions.getWorkflowRun({ ...repo, run_id: Number([...runIds][0]) }),
  ]);
  const e2eWorkflow = workflows.workflows.find((workflow) =>
    workflow.path === '.github/workflows/test-actions.yml'
  );
  if (!e2eWorkflow
    || workflowRun.workflow_id !== e2eWorkflow.id
    || workflowRun.event !== 'pull_request'
    || workflowRun.status !== 'completed'
    || workflowRun.conclusion !== 'success'
    || workflowRun.head_sha !== mergedPullRequest.head.sha) {
    return { reuse: false, reason: 'the successful checks are not from the full E2E workflow for this PR SHA' };
  }

  return { reuse: true, reason: `PR #${mergedPullRequest.number} already validated this exact develop tree` };
}

async function canReusePromotionE2E({ github, repo, pullRequest, mergeTree = getMergeTree }) {
  if (pullRequest?.base?.ref !== 'main' || pullRequest?.head?.ref !== 'release/sync-develop-main') {
    return { reuse: false, reason: 'not a develop-to-main promotion PR' };
  }

  try {
    const [mainRef, developRef, candidate] = await Promise.all([
      github.rest.git.getRef({ ...repo, ref: 'heads/main' }),
      github.rest.git.getRef({ ...repo, ref: 'heads/develop' }),
      github.rest.repos.getCommit({ ...repo, ref: pullRequest.head.sha }),
    ]);
    const mainSha = mainRef.data.object.sha;
    const developSha = developRef.data.object.sha;
    const parents = candidate.data.parents.map((parent) => parent.sha);
    const expectedParents = new Set([mainSha, developSha]);

    if (pullRequest.base.sha !== mainSha || parents.length !== 2 || parents.some((sha) => !expectedParents.has(sha))) {
      return { reuse: false, reason: 'promotion branch is not the exact merge of current main and develop' };
    }

    const expectedTree = mergeTree(mainSha, developSha);
    if (!expectedTree || candidate.data.commit.tree.sha !== expectedTree) {
      return { reuse: false, reason: 'promotion tree differs from the clean merge of main and develop' };
    }

    const [developValidated, mainValidated] = await Promise.all([
      hasSuccessfulPushRun(github, repo, 'deploy-dev.yml', 'develop', developSha),
      hasSuccessfulPushRun(github, repo, 'deploy-production.yml', 'main', mainSha),
    ]);
    if (!developValidated || !mainValidated) {
      return { reuse: false, reason: 'current develop or main SHA has no successful deployment workflow' };
    }

    return { reuse: true, reason: `main ${mainSha} and develop ${developSha} were successfully deployed` };
  } catch (error) {
    return { reuse: false, reason: `verification failed safely: ${error.message}` };
  }
}

async function canReuseE2E({ github, repo, context, mergeTree = getMergeTree }) {
  if (context.eventName === 'push' && context.ref === 'refs/heads/develop') {
    try {
      return await canReuseMergedPullRequestE2E({
        github,
        repo,
        sha: context.sha,
      });
    } catch (error) {
      return { reuse: false, reason: `verification failed safely: ${error.message}` };
    }
  }

  if (context.eventName === 'pull_request') {
    return canReusePromotionE2E({
      github,
      repo,
      pullRequest: context.payload.pull_request,
      mergeTree,
    });
  }

  return { reuse: false, reason: 'event is not eligible for E2E reuse' };
}

module.exports = { canReuseE2E, canReusePromotionE2E, getMergeTree };
