# Release Runbook

This runbook documents manual releases and explicitly authorized automatic patch
releases for versioned tags (for example, `v1.1.4`) and the moving major tag
`v1`.

## Scope

- Keep `master` as the source of truth for release-ready code and generated `dist` artifacts.
- Regenerate `dist/**` after every release version change and prove the committed
  bundle is reproducible before publishing.
- Publish a new versioned release tag from `master`.
- Move the `v1` major tag to the newest compatible release commit.
- Prepare unattended patch releases through a release-preparation PR; do not use
  the manual direct-push path from a webhook workflow.

## Prerequisites

- You have push permission for `master` and tags.
- `gh` CLI is authenticated (`gh auth status`).
- Local repository is clean (`git status`).
- Node dependencies can be installed (`npm ci`).
- The repository no longer uses a long-lived `v1` branch for releases.

## Branch and Release Model

1. `master` is the source of truth for the latest code and generated `dist` artifacts.
2. Manual releases may be prepared directly on `master` after explicit operator
   authorization. Automatic patch releases are prepared on `release/v1.x.y` and
   merged through a reviewed PR.
3. A versioned tag such as `v1.1.4` is created from the verified release commit
   on `master` after validation.
4. The moving major tag `v1` is compare-and-swap updated to the same release
   commit after the versioned tag is pushed. An automatic flow retains a
   concurrently published strictly newer compatible immutable release.

## Legacy Cleanup

Run this section only once when migrating from the old `v1` branch-based process.

1. Verify that no open PR, workflow, or local automation still depends on the `v1` branch.
2. Delete the remote `v1` branch after the team agrees the branch is no longer needed:

   ```bash
   git push origin --delete v1
   ```

3. Delete the local `v1` branch if it still exists:

   ```bash
   git branch -D v1
   ```

Expected result:
- `v1` refers only to the moving major tag and is no longer ambiguous.

---

## Automatic Patch Release Path

Use this path only when a trusted operator prompt explicitly authorizes the full
release write set. A successful dependency merge alone is not authorization.

1. Verify the dependency PR's exact-head merge and inventory every commit after
   the latest immutable version tag.
2. Require every commit in the complete release set to be classified low or
   explicitly authorized medium risk and require the set to be patch-safe.
   High-risk signals take precedence. Dev-only dependency, lint, test, CI, and
   docs-only sets are a no-op when runtime artifacts remain unchanged. An
   authorized medium-risk dev bundler may qualify when its `dist/**` changes are
   expected, attributable, and reproducible. Hold on releaser, high-risk,
   unclassified, breaking, ambiguous, unexpected, or non-reproducible changes.
3. Confirm the next patch version has no conflicting local or remote branch,
   release PR, immutable tag, or GitHub Release.
4. Create `release/<next-version-tag>` from exact `origin/master` in a dedicated
   worktree.
5. Run the baseline gate, apply the version and documentation updates described
   in Phase 1, explicitly regenerate `dist/**`, and run the post-change gates in
   this order:

   ```bash
   nvm use
   npm ci
   npm run all
   npm version <next-version> --no-git-tag-version
   npm run prepare
   npm run all
   npm audit
   npm audit --omit=dev
   git diff --check
   ```

6. Commit `chore(release): prepare <next-version-tag>`, run `npm run prepare`
   again, and require `git status --porcelain` to be empty. Only then push the
   release branch and open a non-draft PR with the repository-required body:

   ```markdown
   ## Summary

   ## Background

   ## Related issue(s)

   ## Implementation details

   ## Test coverage

   ## Breaking changes

   ## Notes

   Created by Codex
   ```

7. Complete the standard reviewer procedure and exact-head GitHub CI. Immediately
   before merge, re-check base, head, CI, release-set eligibility, and version
   collisions. Merge with a merge commit.
8. Read back the release merge and require `origin/master` to equal that exact
   merge commit. Continue with Phase 2 and Phase 3 from that commit. Before
   moving `v1`, record and re-check its raw remote tag-object OID and peeled
   target. Use a raw-OID compare-and-swap, retain a strictly newer compatible
   release target, and hold on any other unexpected target.
9. If any write partially succeeds, report the last verified state and stop.
   Never delete an immutable tag or GitHub Release automatically, undo the
   dependency merge, or repeat a successful write blindly.

The remainder of this runbook is the manual operator flow unless the automatic
path explicitly references a phase.

---

## Phase 1: Update `master` and prepare the release commit

1. Switch to `master` and update all refs:

   ```bash
   git checkout master
   git fetch --all --tags
   git pull --ff-only origin master
   ```

2. Use the repository Node version and run the full validation gate:

   ```bash
   nvm use
   npm ci
   npm run all
   ```

3. Check the latest release tags:

   ```bash
   git tag --sort=-version:refname | head -n 5
   ```

4. Check the current version in `package.json`:

   ```bash
   grep '"version":' package.json
   ```

5. Review the changes since the last release tag:

   ```bash
   git log <last-release-tag>..HEAD --oneline
   ```

6. Determine the next version based on the changes (for example, patch, minor, or major) and update the version files if needed:

   ```bash
   npm version <next-version> --no-git-tag-version
   ```

   Note:
   - `npm version` usually updates both `package.json` and `package-lock.json`.

7. Explicitly regenerate `dist/**`, then rerun the full validation gate after
   the version update:

   ```bash
   npm run prepare
   npm run all
   ```

8. Update documentation that references the latest pinned release version.

   Example:
   - Update `README.md` examples from the previous version tag to `<next-version-tag>` when the pinned release snippets change.
   - Update `docs/index.html` examples from the previous version tag to `<next-version-tag>` when the Pages documentation pins the release tag.

9. Commit generated changes (typically `package.json`, `package-lock.json`, `dist/`, and any release-related documentation updates) if needed:

   ```bash
   git add package.json package-lock.json dist README.md docs/index.html
   git commit -m "chore(release): prepare <next-version-tag>"
   ```

10. Regenerate `dist/**` from the committed release state and require no
    uncommitted change:

    ```bash
    npm run prepare
    test -z "$(git status --porcelain)"
    ```

11. In the manual operator flow, push the release preparation commit to `master`:

   ```bash
   git push origin master
   ```

Expected result:
- `master` contains the validated release commit and all generated artifacts.

---

## Phase 2: Create and push the versioned release tag

1. Confirm you are on `master` and at the expected release commit:

   ```bash
   git branch --show-current
   git rev-parse HEAD
   git rev-parse origin/master
   ```

2. Create an annotated version tag from `master` HEAD:

   ```bash
   git tag -a <next-version-tag> -m "Release <next-version-tag>"
   ```

3. Push the version tag:

   ```bash
   git push origin <next-version-tag>
   ```

Expected result:
- The repository has a new immutable version tag such as `v1.1.4`.

---

## Phase 3: Move the `v1` major tag to the new release commit

1. Record the current raw remote `v1` tag-object OID, then update the local tag
   to the same release commit:

   ```bash
   expected_v1_object="$(git ls-remote origin refs/tags/v1 | awk '{print $1}')"
   git tag -fa v1 -m "Update v1 to <next-version-tag>"
   ```

2. Compare-and-swap the updated `v1` tag:

   ```bash
   git push \
     --force-with-lease=refs/tags/v1:"${expected_v1_object}" \
     origin refs/tags/v1
   ```

3. Read the remote refs again after the compare-and-swap. Do not use a possibly
   stale local `v1` for final verification:

   ```bash
   git ls-remote origin \
     refs/heads/master \
     refs/tags/v1 \
     'refs/tags/v1^{}' \
     'refs/tags/v1.*' \
     'refs/tags/v1.*^{}'
   ```

4. Resolve the fresh peeled `v1` target to exactly one immutable `v1.x.y` tag.
   Require the version to equal `<next-version-tag>` or, only for the automatic
   concurrency path, to be a strictly newer compatible version. Fetch that
   exact tag, prove its commit is an ancestor of remote `master`, and verify its
   published Release:

   ```bash
   git fetch origin \
     refs/heads/master:refs/remotes/origin/master \
     refs/tags/<actual-version>:refs/tags/<actual-version>
   git merge-base --is-ancestor \
     "refs/tags/<actual-version>^{}" \
     origin/master
   gh release view <actual-version> \
     --json tagName,isDraft,isPrerelease,url
   ```

   Require `isDraft=false` and `isPrerelease=false`. Hold if the peeled target
   has zero or multiple immutable version tags, the SemVer or ancestry check
   fails, or the matching GitHub Release cannot be proven.

Expected result:
- `v1` points to the newest compatible release commit.
- Users referencing `@v1` receive the latest `v1.x.y` release.

---

## Operational Checklist

- [ ] `master` updated with `npm run all` success.
- [ ] Automatic patch flows classified the entire release set and used a reviewed release-preparation PR.
- [ ] Release version determined and applied if needed.
- [ ] `dist/**` explicitly regenerated after the release version change.
- [ ] Post-commit `npm run prepare` left the complete working tree clean.
- [ ] `README.md` and `docs/index.html` updated for the latest pinned release version where applicable.
- [ ] Generated `dist` and version files committed and pushed to `master`.
- [ ] New version tag created from `master`.
- [ ] Version tag pushed to remote.
- [ ] `v1` retained on a strictly newer compatible release or compare-and-swap updated to the release commit.
- [ ] `v1` tag push verified.

## Safety Notes

- Do not create the release tag from an outdated local checkout.
- Do not use the manual direct-`master` path from an automatic webhook handoff.
- Do not infer automatic release authority from a merged dependency PR.
- Do not publish any release without explicitly regenerating `dist/**` after the
  version change and proving the post-commit rebuild is clean.
- Do not skip the second `npm run all` after `npm version`; the generated artifacts and lockfile must match the release version.
- Do not update only one release-facing document when both `README.md` and `docs/index.html` pin the latest exact release tag.
- Do not recreate the old `v1` branch after migration; `v1` should remain a tag only.
- Force-updating `v1` changes what `@v1` resolves to, so confirm the target commit before pushing.
- Never update `v1` with an unconditional force push. Compare the raw remote tag
  object with `--force-with-lease`; retain a concurrently published strictly
  newer compatible release and hold on every other unexpected target.
- If the repository enables immutable release or tag policies, verify that moving `v1` is still allowed before starting the release.
- Detect and reuse an exact in-progress release preparation; stop on conflicting
  branches, PRs, tags, or Releases instead of overwriting them.
