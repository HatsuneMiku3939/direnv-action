# Release Flow

Use this checklist after reading `RELEASE_RUNBOOK.md`.

## Manual operator flow

1. Sync local state:
   - `git checkout master`
   - `git fetch --all --tags`
   - `git pull --ff-only origin master`
2. Validate the current tree:
   - `nvm use`
   - `npm ci`
   - `npm run all`
3. Inspect version state:
   - `git tag --sort=-version:refname | head -n 5`
   - `grep '"version":' package.json`
   - `git log <last-release-tag>..HEAD --oneline`
4. Apply the next version:
   - `npm version <next-version> --no-git-tag-version`
5. Update docs that pin the release tag, including `README.md` and `docs/index.html`, then rerun:
   - `npm run all`
6. Commit and publish:
   - `git add package.json package-lock.json README.md docs/index.html dist`
   - `git commit -m "chore(release): prepare <next-version-tag>"`
   - `git push origin master`
7. Tag and release:
   - `git tag -a <next-version-tag> -m "Release <next-version-tag>"`
   - `git push origin <next-version-tag>`
   - `gh release create <next-version-tag> --title "<next-version-tag>" --generate-notes`
8. Move the major tag:
   - record the current raw remote tag-object OID with
     `git ls-remote origin refs/tags/v1`
   - `git tag -fa v1 -m "Update v1 to <next-version-tag>"`
   - `git push --force-with-lease=refs/tags/v1:<expected-raw-tag-object> origin refs/tags/v1`
9. Verify:
   - `git rev-list -n 1 <next-version-tag>`
   - `git rev-list -n 1 v1`
   - `gh release view <next-version-tag>`

## Authorized automatic patch flow

1. Verify handoff and release set:
   - prove the dependency PR merge and parents;
   - inventory `<last-version-tag>..origin/master` and linked PRs;
   - apply `release-eligibility.md` and stop on no-op or hold.
2. Check collisions:
   - local and remote `release/<next-version-tag>` refs;
   - open and closed matching release PRs;
   - local and remote immutable tag, GitHub Release, and moving `v1`.
3. Prepare from exact `origin/master` in a dedicated worktree:
   - `npm ci`
   - `npm run all`
   - `npm version <next-version> --no-git-tag-version`
   - update `README.md` and `docs/index.html`
   - `npm run all`
   - `npm audit`
   - `npm audit --omit=dev`
   - `git diff --check`
4. Commit and publish the preparation branch:
   - stage only `package.json`, `package-lock.json`, `README.md`,
     `docs/index.html`, and expected regenerated `dist` files;
   - commit `chore(release): prepare <next-version-tag>`;
   - re-check the source branch ref, then push the release branch.
5. Open a non-draft PR with the required repository body sections and
   `Created by Codex`; apply the appropriate release or maintenance label.
6. Run the standard reviewer procedure, address authorized findings, and wait
   for exact-head GitHub CI.
7. Re-check base, exact head, CI, version collision state, and release-set
   eligibility immediately before merge; merge with a merge commit.
8. Read back the release PR merge and fast-forward local `master`.
9. Require `origin/master` to equal the exact release merge commit before
   creating the annotated immutable tag.
10. Re-check tag absence, push the immutable tag, and create the GitHub Release.
11. Re-check the old remote `v1` raw tag-object OID and peeled target. If it
    already targets the intended release, continue. If it targets a strictly
    newer compatible immutable release, retain it and continue. Hold on any
    other target. Otherwise move it with
    `--force-with-lease=refs/tags/v1:<expected-raw-tag-object>` and verify the
    default branch, immutable tag, `v1`, and Release together.
12. Clean the merged release worktree and local branch without force deletion.
