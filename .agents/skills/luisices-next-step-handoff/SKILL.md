---
name: luisices-next-step-handoff
description: >-
  Use when a Luisices task, CI run, release, audit, or refactoring milestone is
  complete and the user expects continued collaboration. State the concrete
  recommended next step and explicitly ask whether to proceed.
---

# Luisices Next-Step Handoff

Use this skill at a meaningful stopping point in an ongoing Luisices workstream.
The user prefers an explicit recommendation and a direct question about whether
to continue, rather than having to infer what happens next.

## Handoff

1. State what completed and its verified status. Mention important remaining
   work or limitations plainly.
2. Recommend one concrete next step that follows from the result. Give a short
   reason when it is not obvious.
3. End with a direct question, such as: “Quer que eu siga com [next step]?”

Keep the recommendation focused. Avoid generic endings such as “avise se
precisar” and avoid presenting a long list of possible next steps when one is
clearly preferable.

## CI, Deploy, and Release Context

- At every CI or release milestone, name the branch and environment explicitly:
  for example, “PR merged into `develop`; dev deployment completed” or “PR
  merged into `main`; production deployment completed.”
- Never describe a merge into `develop`, a dev deploy, or a green CI run as a
  production release. Confirm the `main` merge and production workflow before
  saying production was delivered.
- If the user is pursuing promotion to production, report the remaining release
  gates and continue through already authorized steps. Do not silently treat a
  prerequisite change in `develop` as the final delivery.
- Distinguish checks that passed on the PR from checks or deployments triggered
  after merge. Explain when a post-merge workflow is a separate trigger or a
  deliberate fallback, and whether resources were actually published.
- Ask about the next step only at a boundary the user has not already authorized.
  If the user has directed the release goal, continue that workflow and ask only
  before a distinct optional action or when a real blocker requires a choice.

## Pull Request Lifecycle

- Before opening a PR, check for an existing open PR that already covers the
  branch or release. Update or continue that PR when possible; do not create a
  duplicate release PR.
- For a release promotion, keep one active `develop` to `main` PR. Reuse the
  established release branch and verify its base and head are current before
  pushing updates.
- Do not leave an agent-created PR open as an unexplained stopping point. If
  the user authorized the merge, continue through required checks, merge, and
  post-merge workflow verification. If merge is not authorized, or a required
  review/check blocks it, report the exact blocker and the specific action
  needed; do not claim the release task is complete.
- Close a superseded PR only after confirming it has no unique changes and the
  replacement is valid. Do not close another person's PR or bypass branch
  protections without explicit authorization.
- In the handoff, report any remaining open PR by number, its checks/status,
  why it remains open, and the next required action.

## Continue Without Pausing

- If the user already directed the next step, do it; do not ask whether to do
  what they just requested.
- Keep completing work that is already authorized and necessary to make the
  result usable and verifiable. Ask at the boundary of a distinct optional
  action, not before finishing the current task.
- Do not treat this skill as authorization to commit, push, deploy, publish,
  contact others, or perform another external or destructive action.
- If a required external action is blocked, state what is blocked, why, and the
  specific action needed to resume.

## Example

> O CI passou e não publicou recursos. O próximo passo recomendado é promover
> o PR validado para `main`. Quer que eu prepare essa promoção?
