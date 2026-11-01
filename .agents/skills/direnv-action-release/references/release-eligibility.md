# Automatic patch-release eligibility

Use this contract for a trusted automatic handoff after a verified Dependabot
merge. It consumes merge/remediation evidence; it never creates write authority.
Read authority from the verified `origin/master` snapshot, not PR-head edits.

## Retained risk and allowed evidence

Keep the maintainer's complete-subtree classification. Runtime dependencies,
majors, install scripts, request-path code, and ownership warnings remain high;
expected artifacts or passing tests do not turn them medium.

Require upstream release/breaking notes assessed against actual usage, registry
integrity and available signatures/provenance, script/ownership inspection,
complete dependency and generated-module attribution, clean reproducible builds,
consumer-level regressions, full local checks, independent reviewer Findings: 0,
current exact-head CI, and exact merge-parent read-back for high remediation.
Missing optional provenance is recorded; failed verification is a hold.

Allowed categories under explicit trusted operator authority are:

- low and authorized medium changes with their applicable original merge gates;
- fully evidenced historical A-stage dev-tool major or runtime patch/minor
  changes, including request-path libraries;
- high verified dependency remediation under
  [the repository contract](../../../../docs/maintenance/dependency-remediation.md),
  including runtime majors, related parent/transitive updates, narrow tracked
  compatibility patches, and necessary install/prepare/build changes;
- previously explicitly approved high/manual changes with recorded authority,
  attributable independently reviewed scope, and sufficient current whole-set
  patch-safety evidence. A prior manual merge or approval alone is insufficient.

An internal dependency API break may be adapted while preserving the Action's
public contract. Hold caller-facing breaking or contract-expanding behavior,
required migrations, unverified maintainer/releaser or ownership changes,
unattributable artifacts, failed verification, and stale/unavailable/ambiguous
required gates. An install/build repair is eligible only with the repository
contract's scope, clean-install, mismatch-failure, and reproducibility evidence.

## Complete release set

Require all of the following:

- The triggering bot PR and every required companion/replacement merged under
  their applicable authority. Every merge read-back proves the verified head is
  a parent. Record original/companion identities separately.
- The latest immutable version tag and peeled commit are unambiguous. Inventory
  every commit after it through the exact current `origin/master`, including
  companion changes and any earlier manual/high members.
- Each commit maps to a reviewed PR or independently verified release-safe
  commit in an allowed category. No-op impact alone cannot classify policy or
  ownership changes low. Reclassify and revalidate if master moves.
- The entire set is patch SemVer for the Action: no new input/output, behavior
  contract expansion, required migration, supported runtime/platform removal,
  or intended caller-facing break. Dependency major versions alone do not set
  the Action's version.
- All required repairs are already present in current master. Both whole-set
  `npm audit` and `npm audit --omit=dev` report zero findings. Map older audit
  reports to their actual fixes transparently; do not call historical failures
  clean or use a predicted future merge as closure. A combined local preflight
  is not a substitute for the merged final head and its release gates.
- Expected shipped changes are fully attributable and reproducible, including
  optional runtime modules pulled into the bundle by development tools.
  Generated normalization must preserve string/template values; deterministic
  output alone is insufficient.

Release need is determined **before** the version bump. Source, action metadata,
production dependencies, runtime security fixes, or authorized build-tool or
verified compatibility changes may have real shipped impact. Version-bump
artifacts cannot establish that need. Do not treat missing required dist updates
as a no-op.

Return `release_not_required` only after the entire set is in allowed categories
and has no shipped impact. Return `release_held` for unclassified or unauthorized
high changes, uncertain patch safety, incomplete repair, unexpected or
nonreproducible output, verification failure, missing evidence, or collisions.
No routine user approval is needed for an already authorized class whose full
evidence passes; do not expand the class to avoid a hold.

## Version and collision checks

- Parse the highest immutable `v1.x.y` tag and increment only its patch component.
- Require package.json and package-lock.json to match the released version
  before preparing the next one.
- Inspect local/remote release branches, open/closed matching PRs, immutable
  tags, GitHub Releases, and the moving v1 before creating anything. Reuse an
  exact matching preparation; hold on conflicts.
- Record and recheck the remote v1 raw tag-object OID and peeled target. Accept
  the intended version, or retain a strictly newer compatible immutable version
  with exactly one published matching Release and master ancestry. Otherwise
  hold. Change v1 only with a raw-OID compare-and-swap.

## Required release evidence

- Complete commit/PR inventory, exact source master, retained risks and authority,
  original/companion heads, merge-parent read-backs, and repair closure.
- Node/npm versions, clean npm ci, full npm run all, real consumer/failure paths,
  both zero-finding audits, signatures/provenance assessment and diff checks.
- Explicit dist regeneration after the version change and a clean whole-tree
  post-commit rebuild; all exact-version documentation pins updated.
- Independent standard reviewer Findings: 0 and current exact-head release CI.
- Release PR merge commit and verified parent; immutable annotated patch tag,
  exactly one non-draft/non-prerelease GitHub Release; fresh raw/peeled v1 and
  immutable refs, compatible version and master ancestry.

The reviewed release-preparation PR, merge commit, mandatory rebuild, immutable
publication order, raw-OID v1 CAS, and partial-failure rules remain unchanged.
No direct master push, npm publish, minor/major release, immutable replacement,
branch-rule bypass, or repository-settings change is authorized here.
