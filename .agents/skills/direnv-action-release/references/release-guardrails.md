# Release Guardrails

- `master` is the release source of truth. Do not create the release from an outdated branch.
- Treat direct `master` push as a manual operator path only. An automatic patch
  handoff must use a dedicated release-preparation PR.
- Use the Node version from `.nvmrc`.
- Classify every commit since the latest immutable version tag before automatic
  patch preparation. Hold on unclassified or non-patch-safe commits.
- Always run `npm run all` after the version bump.
- Do not hand-edit `dist/`; regenerate it through `npm run prepare` as part of `npm run all`.
- Update both `README.md` and `docs/index.html` when they pin the latest exact release tag.
- Use a Conventional Commit message for the release-preparation commit.
- Detect existing release branches, PRs, tags, and Releases before every create;
  reuse exact matches and stop on conflicts.
- Re-check the affected ref or exact PR head before every remote write.
- Publish both the immutable version tag and the moving `v1` tag.
- Verify `v1` and the version tag resolve to the same commit before finishing.
- If pushing to `master` shows a branch-rule warning but the push succeeds, report that explicitly.
- Never delete an immutable tag or GitHub Release automatically after a partial
  failure. Report the last verified state and stop.
