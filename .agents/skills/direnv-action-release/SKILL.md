---
name: direnv-action-release
description: Classify, prepare, and publish direnv-action releases through either an explicitly requested manual flow or an explicitly authorized release-preparation PR handoff after a verified Dependabot merge. Use for patch, minor, or major releases, release-set review, automated patch-release evaluation, version/tag publication, GitHub Releases, and moving v1 updates.
---

# direnv-action Release

Keep `master`, immutable version tags, GitHub Releases, and the moving `v1` tag
consistent while preserving the caller's write authority.

## Required Context

- Read `AGENTS.md` for repository guardrails and validation rules.
- Read `RELEASE_RUNBOOK.md` for the canonical release flow.
- Read [`references/release-flow.md`](./references/release-flow.md) for the command checklist.
- Read [`references/release-guardrails.md`](./references/release-guardrails.md) before pushing or retagging.
- Read [`references/release-eligibility.md`](./references/release-eligibility.md)
  before an automatic patch-release handoff.

## Write Authority

- Treat release-set and version inspection as read-only.
- Use the manual flow only when the user explicitly asks to publish a release.
- Use the automated patch flow only when a trusted operator prompt explicitly
  authorizes the release branch, preparation PR, exact-head merge, immutable
  patch tag, GitHub Release, and moving `v1` update.
- Never infer release authority from a merged dependency PR, changed `dist`, or
  skill invocation alone.
- Stop automatic publication for minor, major, breaking, unclassified, or
  medium/high-risk release sets.
- Honor newer constraints such as `read only` or `do not release`.

## Select the Flow

### Manual release

Follow the existing manual path in `RELEASE_RUNBOOK.md` for an explicitly
requested patch, minor, or major release. Direct `master` push remains a manual
operator path only.

### Authorized automatic patch release

1. Confirm the verified dependency merge and classify every commit after the
   latest immutable version tag.
2. Return `release_not_required` or `release_held` when the eligibility reference
   requires it.
3. Detect an existing matching release branch, PR, tag, or GitHub Release before
   creating anything.
4. Prepare the next patch version in a dedicated `release/v1.x.y` worktree.
5. Update version files, `README.md`, and `docs/index.html`; run `nvm use`,
   `npm ci`, `npm run all`, full and production audits, and diff checks.
6. Commit and open a non-draft release-preparation PR using the repository PR
   body contract. Run the standard reviewer procedure and wait for current CI.
7. Re-check the exact release PR head before merge, use a merge commit, and
   verify the merge read-back.
8. Publish the annotated immutable tag and GitHub Release from the exact release
   merge commit. Move `v1` with a raw tag-object compare-and-swap, retaining a
   concurrently published strictly newer compatible target, then verify all
   refs and the Release.

Re-check the relevant remote ref, PR head, tag, or Release immediately before
every external write. On a partial failure, report the last verified state and
stop; never delete an immutable tag or Release, undo the dependency merge, or
repeat a successful write blindly.

## Output Expectations

Report:

- the chosen release version
- validation commands that passed
- the release-preparation commit SHA
- the release-preparation PR and exact merge commit when that flow is used
- the version tag and GitHub Release URL
- whether `v1` points to the release commit or a verified strictly newer
  compatible immutable release
- the terminal state: `release_not_required`, `release_held`,
  `release_prepared`, `release_published`, or `release_partial_failure`
