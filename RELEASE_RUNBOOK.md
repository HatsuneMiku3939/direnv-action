# Release Runbook

This runbook documents the release flow for `latest` (from `master`) and `v1` (from the `v1` branch).

## Scope

- Keep `latest` aligned with the newest validated `master` state.
- Keep `v1` aligned with `master` through a PR and CI gate.
- Publish a new version tag from `v1`.

## Prerequisites

- You have push permission for `master`, `v1`, and tags.
- `gh` CLI is authenticated (`gh auth status`).
- Local repository is clean (`git status`).
- Node dependencies are installed (`npm ci`).

## Branch and Release Model

1. `master` is the source of truth for the latest code and generated `dist` artifacts.
2. `v1` is updated from `master` via pull request.
3. Version tags are created from `v1` after synchronization.

---

## Phase 1: Update `master` and refresh `latest`

1. Switch to `master` and update it:

   ```bash
   git checkout master
   git pull --ff-only origin master
   ```

2. Run full validation and artifact generation:

   ```bash
   npm ci
   npm run all
   ```

3. Commit generated changes (typically `dist/`) if needed:

   ```bash
   git add dist
   git commit -m "chore(release): refresh dist artifacts"
   ```

4. Push to `master`:

   ```bash
   git push origin master
   ```

Expected result:
- `latest` release reflects this updated `master` state.

---

## Phase 2: Sync `v1` from `master` through PR

1. Create a sync branch from `v1`:

   ```bash
   git checkout v1
   git pull --ff-only origin v1
   git checkout -b chore/sync-master-into-v1-<date>
   ```

2. Merge `master` into the sync branch:

   ```bash
   git merge --no-ff origin/master
   ```

3. Push the sync branch:

   ```bash
   git push -u origin chore/sync-master-into-v1-<date>
   ```

4. Create a PR to `v1` with GitHub CLI:

   ```bash
   gh pr create \
     --base v1 \
     --head chore/sync-master-into-v1-<date> \
     --title "Sync master into v1" \
     --body "Sync master changes into v1 after latest refresh." \
     --label documentation
   ```

5. Wait for CI to pass, then merge with merge commit:

   ```bash
   gh pr merge --merge
   ```

Expected result:
- `v1` branch is synchronized with the latest `master` changes.

---

## Phase 3: Tag from `v1` and publish release

1. Update local `v1` after merge:

   ```bash
   git checkout v1
   git pull --ff-only origin v1
   ```

2. Choose the next semantic version (for example from `v1.1.2` to `v1.1.3`).
3. Create an annotated tag on `v1` HEAD:

   ```bash
   git tag -a v1.1.3 -m "Release v1.1.3"
   ```

4. Push the tag:

   ```bash
   git push origin v1.1.3
   ```

Expected result:
- Release workflow is triggered and published from the new `v1.x.y` tag.

---

## Operational Checklist

- [ ] `master` updated with `npm run all` success.
- [ ] Generated `dist` committed and pushed to `master`.
- [ ] PR from sync branch into `v1` created.
- [ ] CI passed on the PR.
- [ ] PR merged using merge commit.
- [ ] New version tag created from `v1`.
- [ ] Tag pushed to remote.

## Safety Notes

- Do not tag from `master` if your policy requires tagging from `v1`.
- Do not skip `npm run all`; otherwise, release artifacts may be inconsistent.
- Confirm branch before tag creation (`git branch --show-current`).
