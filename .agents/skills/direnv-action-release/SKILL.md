---
name: direnv-action-release
description: Prepare and publish a release for the direnv-action repository when the user asks for a patch, minor, or major release, wants the RELEASE_RUNBOOK followed, or needs the version tag, GitHub Release, and moving v1 tag updated together.
---

# direnv-action Release

Use this skill when the user asks to release `direnv-action`, bump the release version, or publish a new `v1.x.y` tag.

## Required Context

- Read `AGENTS.md` for repository guardrails and validation rules.
- Read `RELEASE_RUNBOOK.md` for the canonical release flow.
- Read [`references/release-flow.md`](./references/release-flow.md) for the command checklist.
- Read [`references/release-guardrails.md`](./references/release-guardrails.md) before pushing or retagging.

## Workflow

1. Confirm the working tree is clean and `master` is up to date.
2. Determine the next version from the requested release type and the latest `v*` tag.
3. Update the version with `npm version <version> --no-git-tag-version`.
4. Update release-facing documentation that pins an exact version tag.
5. Run the full validation gate with `nvm use`, `npm ci`, and `npm run all`.
6. Commit the release-preparation changes to `master` with a Conventional Commit message.
7. Push `master`, create the annotated version tag, and publish the GitHub Release.
8. Force-move the `v1` tag to the same commit and verify both tags resolve to the release commit.

## Output Expectations

Report:

- the chosen release version
- validation commands that passed
- the release-preparation commit SHA
- the version tag and GitHub Release URL
- whether `v1` now points to the same commit
