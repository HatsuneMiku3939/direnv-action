# Release Guardrails

- `master` is the release source of truth. Do not create the release from an outdated branch.
- Use the Node version from `.nvmrc`.
- Always run `npm run all` after the version bump.
- Do not hand-edit `dist/`; regenerate it through `npm run prepare` as part of `npm run all`.
- Update `README.md` when it pins the latest exact release tag.
- Use a Conventional Commit message for the release-preparation commit.
- Publish both the immutable version tag and the moving `v1` tag.
- Verify `v1` and the version tag resolve to the same commit before finishing.
- If pushing to `master` shows a branch-rule warning but the push succeeds, report that explicitly.
