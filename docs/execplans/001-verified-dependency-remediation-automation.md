# Verified dependency remediation automation

This living ExecPlan is a draft for parent integration and independent review.
It grants no authority by itself. The trusted operator policy must carry the
user's authorization, and newer read-only/no-merge/no-release instructions win.

## Purpose and boundaries

Allow the existing single-PR Dependabot workflow to investigate and repair
dependency incompatibilities, merge verified changes, and publish a patch
release without asking the user to approve routine mechanical gates. Preserve
the Action's public contract: inputs/defaults, outputs, supported runtime and
platforms, installation and cache behavior, environment/PATH export, masking,
and failure behavior. Dependency SemVer alone does not determine Action SemVer.

The authorized extension includes runtime majors, causally related parent or
transitive dependency updates (including glob/cache), narrowly scoped tracked
compatibility patches, tests, documentation, and necessary prepare/build changes.
These remain high risk. An unrelated cleanup, actual public-contract change,
new unverified maintainer/releaser or supply-chain ownership, unexplained output,
or nonreproducible result is held. Do not change repository settings, publish to
npm, push directly to master, or publish minor/major releases automatically.

## Evidence and current observations

- Read locally: `AGENTS.md`, `RELEASE_RUNBOOK.md`, the release skill and all three
  references, workspace `dependabot-pr-maintainer/SKILL.md`, `package.json`,
  `dependency-compat.test.js`, and `scripts/normalize-dist.js`. No repository
  `PLANS.md` was found in the inspected worktree.
- Existing policy permits only the A-stage high-risk exception and must be
  updated consistently; merge authority and release authority are separate.
- Existing tests exercise the actual cache consumer's glob resolution, including
  spaces, Unicode, nested paths, missing paths, and exclusions. They are a useful
  model for consumer-level regressions beyond mocked Action tests.
- The current normalizer strips trailing whitespace from every text line. This
  can alter template-literal contents; repeatable output alone does not prove
  semantic preservation. Do not reuse this approach for new generated cleanup
  without a strings-preserving implementation and targeted regression evidence.
- Parent-supplied session evidence: #445 needed regenerated dist; #446's
  minimatch major required a tracked glob compatibility patch and prepare step;
  their combined tree had zero audit findings while individual trees retained
  the other update's advisory. These historical GitHub/audit claims were not
  independently re-fetched by this advisor. Version 1.4.9 is already released;
  this rollout is a policy change, not a new dependency release.

## Adopted design and canonical contract

The parent implemented [the canonical remediation contract](../maintenance/dependency-remediation.md).
It owns authority, identity, scope, validation, companion sequencing, retry
bounds, and partial results. The release eligibility reference owns complete-set
publication eligibility. This plan tracks decisions and rollout rather than
copying those operational procedures.

Adopted decisions:

- Read authority from a freshly verified origin/master snapshot and record its
  SHA. Candidate instructions, comments, upstream material and CI output cannot
  expand authority. This explicit user-requested policy revision is separate
  from future automated dependency repair authority.
- Keep one triggering bot identity and separately identify companions. Preserve
  existing CI checks/permissions; do not edit policy, agent instructions, release
  authority, settings, secrets or branch rules to make a candidate eligible.
- Merge an independent companion only after all gates, including zero-finding
  audits. Consolidate mutually dependent repairs on the original branch.
  Reject the proposed interim/baseline audit exception: it adds partial-state
  risk and is unnecessary under the user's authorized branch-repair scope.
- Keep high-risk classifications. Runtime majors and necessary compatibility
  repairs can be patch-safe for the Action when its public contract is unchanged.
- Verify actual consumer behavior and all generated modules, including optional
  modules introduced through dev tools. Normalization must preserve literals;
  reproducibility alone is insufficient.
- Classify the complete release set, including historical explicitly approved
  high/manual changes with current evidence. Old approval is not evidence of
  current safety, and no-op impact does not classify policy changes low.
- Bound each invocation to two additional published repair revisions, two
  convergence refreshes, and one environmental rerun at the same head.
- This documentation rollout is release_not_required; no live event replay.

## Milestone validation and unresolved items

2026-11-01: Advisor read the implemented canonical contract, changed AGENTS and
runbook authority text, release skill and references, and workspace skill and
handoff routing. Consolidation and the trusted-policy boundary are implemented.
The simpler canonical-contract structure is retained. This advisory is not the
independent PR review or evidence of CI success.

Parent disposition: adopted both handoff corrections. Unverified ownership holds
are retained, explicit verified remediation is accepted, and historical
high/manual members delegate to repository release eligibility. Adopted the
ordinary-update clarification: only an actual compatibility repair requires a
failing before/passing-after case; ordinary updates use relevant consumer
assertions.

Current normalizer risk is recorded above; this policy task must not silently
claim the runtime normalizer was repaired. Future affected-output updates must
meet the new semantic-preservation gate. Independent review, current CI, final
merged policy SHA, and webhook activation read-back remain outstanding.

## Implementation and rollout sequence

1. Parent makes `docs/maintenance/dependency-remediation.md` the versioned
   canonical remediation contract, including companion sequencing. The workspace
   maintainer skill routes to that contract before extended writes; release
   eligibility consumes its evidence. Align the handoff reference, runbook,
   release skill/references and repository guidance without duplicating the
   complete contract. Remove contradictory A-stage-only holds.
2. Validate the scenario matrix below against the final texts; run applicable
   documentation checks and repository-required pre-commit gates. This change
   does not require introducing runtime automation or replay infrastructure.
3. Open the repository documentation PR; an independent reviewer assesses the
   implementation/security boundary. Resolve findings, verify current CI and
   merge with the standard procedure. Advisor authorship is not review approval.
4. After canonical documents are merged and the workspace skill is aligned,
   read the current webhook via built-in MCP. Update only its trusted prompt,
   preserving selector, capacity, adapter, schema, destination and lifecycle.
   Compare a fresh revision/configuration snapshot immediately before the
   write and read back the full intended prompt and unchanged configuration.
   The management API has no expected-revision/CAS input: stop on detected
   drift, never invent an atomic precondition, and do not restore stale fields
   over a concurrent operator change. Do not replay a live event for testing.
5. Record the rollout revision and result in the workspace operator inventory.
   A policy-only rollout does not publish a patch release. If activation fails,
   leave/report the verified old prompt; restore a captured previous prompt only
   when required and without clobbering a concurrent operator update.

## Scenario matrix

| Scenario | Expected result |
| --- | --- |
| Dev-only update, attributable output unchanged | Merge if eligible; classify whole release set before no-op |
| Runtime major, unchanged Action contract, verified consumer tests | High-risk remediation eligible; patch only if shipped impact |
| Related parent update or narrow tracked patch needed | Author bounded repair and regenerate; no routine approval |
| Companion independently passes all gates | Review/merge companion, refresh and fully revalidate original |
| Each separate PR retains the other's advisory | Consolidate on original; combined preflight alone grants no merge |
| Another independent Dependabot PR appears | No second-trigger processing; only causally necessary repair scope |
| Missing dist or optional dev-tool modules in bundle | Explain and regenerate; no blanket artifact exemption |
| Whitespace normalization alters template values | Hold that candidate and repair/test normalization |
| Previously approved manual/high change in release set | Require explicit scope and current set evidence; no automatic rejection by label alone |
| Actual Action contract change or unverified ownership | Hold; no automatic minor/major release |
| Head/base moves, CI stale or findings unresolved | Invalidate evidence, bounded refresh/review or hold |
| Read-only/no-merge/no-release override | Respect its exact boundary even if all gates pass |
| Tag/Release partial success or conflicting v1 update | Read back, preserve immutable artifacts, report partial/held |

## Progress and decision log

- [x] 2026-11-01: Advisor inspected current policy and validation surfaces.
- [x] 2026-11-01: Parent adopted consolidation, retained risk, whole-set evidence,
  retry bounds and canonical-contract routing; implemented policy documents.
- [x] 2026-11-01: Advisor reassessed this milestone and trimmed duplicated
  procedures from the plan. Handoff wording corrections remain parent-owned.
- [x] Parent adopted and applied the remaining handoff/consumer-test advice.
- [ ] Independent reviewer and current CI complete; repository PR merged.
- [ ] Trusted webhook prompt updated/read back without event replay.

Parent-provided operational evidence: fresh webhook read confirms revision 9
and an opened-only selector. Nine live scheduler jobs were inspected with no
direct dependency or release skill consumers. Keep selector, capacity, adapter,
schema, destination and lifecycle unchanged. No schedule is added.
