# Automatic patch-release eligibility

Use this contract only for a trusted automatic handoff after a verified
Dependabot merge. Do not use it to broaden the Dependabot merge-risk policy.

## Require all conditions

- The original PR was merged inside its authorized unattended risk boundary.
- Merge read-back proves the verified PR head is a parent of the merge commit.
- The latest immutable version tag and its peeled commit are unambiguous.
- Every commit after that tag through the verified merge commit maps to a reviewed
  PR or an already verified release-safe commit.
- The complete release set is patch SemVer: no breaking change, new input/output,
  behavior contract expansion, or required migration.
- The set changes a shipped runtime surface: `dist/**`, `action.yml`, a production
  dependency included in `dist`, or a runtime security fix delivered by a tag.
- No install script, maintainer/releaser warning, auth/proxy/network/request-path
  change, unexpected generated artifact, or failing gate exists.

Return `release_not_required` when changes are limited to dev-only lockfile,
lint, test, CI, or documentation updates and committed runtime artifacts are
unchanged.

Return `release_held` when any commit is unclassified, the release set includes a
medium/high-risk change, patch SemVer is uncertain, a matching release artifact
conflicts, or a required gate cannot be proven current.

## Version and collision checks

- Parse the highest immutable `v1.x.y` tag and increment only its patch component.
- Require `package.json` and `package-lock.json` to match the current released
  version before preparing the next one.
- Search local and remote refs, open and closed PRs, and GitHub Releases for the
  intended branch and version.
- Reuse an exact in-progress preparation. Hold on any conflicting branch, PR,
  tag, or Release; never overwrite it.

## Required evidence

- release-set commit and PR inventory;
- exact source `origin/master` SHA;
- Node and npm versions from `.nvmrc`;
- clean `npm ci`, `npm run all`, `npm audit`, `npm audit --omit=dev`, and
  `git diff --check`;
- expected file set for the release preparation;
- reviewer findings and exact-head GitHub CI;
- release PR merge commit and parent relationship;
- peeled `origin/master`, immutable tag, and `v1` targets plus GitHub Release
  read-back.
