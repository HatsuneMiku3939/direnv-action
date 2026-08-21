# Automatic patch-release eligibility

Use this contract only for a trusted automatic handoff after a verified
Dependabot merge. Do not use it to broaden the Dependabot merge-risk policy.

## Require all conditions

- The original PR was merged inside its authorized unattended low/medium-risk
  boundary.
- Merge read-back proves the verified PR head is a parent of the merge commit.
- The latest immutable version tag and its peeled commit are unambiguous.
- Every commit after that tag through the verified merge commit maps to a reviewed
  PR or an already verified release-safe commit.
- The complete release set contains only classified low or explicitly authorized
  medium-risk changes and is patch SemVer: no breaking change, new input/output,
  behavior contract expansion, or required migration. High-risk signals always
  take precedence.
- The set changes a shipped runtime surface because of a source, `action.yml`,
  production-dependency, runtime-security, or authorized medium-risk dev bundler
  change. Generated `dist/**` must be expected, attributable, and reproducible;
  it is not an independent reason to release.
- No install script, maintainer/releaser warning, auth/proxy/network/request-path
  change, unexpected generated artifact, or failing gate exists.

Classify the cause before generated effects. Return `release_not_required` when
changes are limited to dev-only lockfile, lint, test, CI, or documentation
updates and committed runtime artifacts are unchanged. An authorized medium-risk
dev bundler may qualify when its generated `dist/**` is expected and reproducible.
Return `release_held` for unexpected or non-reproducible generated output, or
when a releaser change appears.

Return `release_held` when any commit is unclassified, the release set includes a
high-risk change, patch SemVer is uncertain, a matching release artifact
conflicts, or a required gate cannot be proven current.

## Version and collision checks

- Parse the highest immutable `v1.x.y` tag and increment only its patch component.
- Require `package.json` and `package-lock.json` to match the current released
  version before preparing the next one.
- Search local and remote refs, open and closed PRs, and GitHub Releases for the
  intended branch and version.
- Reuse an exact in-progress preparation. Hold on any conflicting branch, PR,
  tag, or Release; never overwrite it.
- Before moving `v1`, record both its raw remote tag-object OID and peeled target.
  Treat an exact intended target as complete, retain a strictly newer compatible
  immutable tag with a matching GitHub Release, and hold on any other target.
  Update only with a raw-OID `--force-with-lease`; never use an unconditional
  force push.

## Required evidence

- release-set commit and PR inventory;
- exact source `origin/master` SHA;
- Node and npm versions from `.nvmrc`;
- clean `npm ci`, mandatory post-version `npm run prepare`, `npm run all`,
  `npm audit`, `npm audit --omit=dev`, and `git diff --check`;
- a post-commit `npm run prepare` that leaves the complete working tree clean;
- expected file set for the release preparation;
- reviewer findings and exact-head GitHub CI;
- release PR merge commit and parent relationship;
- peeled `origin/master`, immutable tag, and `v1` targets plus the raw `v1` tag
  object and GitHub Release read-back. Final `v1` evidence must come from fresh
  remote refs and map to exactly one compatible immutable version tag on
  `master` with a non-draft, non-prerelease Release.
