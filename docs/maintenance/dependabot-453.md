# fast-xml-parser 5.12.0 verification

## Identity and authority

- Repository: `HatsuneMiku3939/direnv-action`; original PR #453, database ID
  `5268327641`, author `app/dependabot`; triggering actor `dependabot[bot]`
  (ID `49699333`). Original head `cc98f9f456f93d6c4b16a8d32dbbaf145c44a971`.
- Verified authority/base: `origin/master` at
  `01184f36f0b8d165a71c88c71ea3e8ed821be0dc`, including the remediation contract,
  release skill/references and runbook. The trusted operator authorizes verified
  high-risk remediation and eligible patch publication. No companion is needed.
- Risk remains **high**: runtime/request-path XML parsing, a transitive major
  (`@nodable/entities`), new packages, and OIDC releaser transitions.
- Public Action implementation, inputs, defaults, supported platforms, checksum,
  cache, exports, masking and failure contract are unchanged.

## Scope and upstream evidence

The cache dependency reaches `@azure/storage-blob@12.31.0`, then
`@azure/core-xml@1.5.0`, then `fast-xml-parser`. The original PR changes only the
lockfile. Its initial `check-dirty` failure is missing generated output, not an
Action test regression. This repair regenerates both dist files and adds actual
storage SDK consumer tests; it changes no automation authority.

The complete changed resolution is:

| Package | Previous | Candidate | Reason |
| --- | --- | --- | --- |
| fast-xml-parser | 5.7.1 | 5.12.0 | Trigger; Azure core-xml accepts ^5.0.7 |
| @nodable/entities | 2.1.0 | 3.1.0 | Parser entity decoding |
| fast-xml-builder | 1.2.0 | 1.3.1 | Parser exports; Azure XML serialization |
| path-expression-matcher | 1.5.0 | 1.6.2 | Parser/builder path matching |
| strnum | 2.2.3 | 2.5.1 | Parser number support |
| xml-naming | 0.1.0 | 0.3.0 | Parser/builder XML names |
| is-unsafe | absent | 2.0.3 | Entity decoder unsafe-content checks |
| anynum | absent | 1.0.1 | strnum Unicode decimal digit support |

Reviewed upstream parser changelog v5.7.1..v5.12.0: validator complexity,
DOCTYPE/name validation, entity handling, stop-node matching, metadata offsets,
Uint8Array decoding and the declared subtree updates. Azure keeps tag and
attribute values as strings; tests cover real SDK serialization/deserialization
rather than a direct parser mock. Added SDK transport fixtures exercise list
responses (attributes, multiple entries, entities, Unicode and whitespace), block
list request serialization and structured 403 errors. Only the HTTP transport is
substituted; the SDK pipeline and XML implementation are real. Existing CI runs
this file on Linux and macOS and retains Action success/failure E2E paths.

All changed packages retain maintainer `amitgupta`. Parser, builder, strnum and
is-unsafe now publish using GitHub Actions OIDC. `npm audit signatures` verifies
204 registry signatures and 49 available attestations, with zero invalid/missing
signatures. For those four changed OIDC packages the verified SLSA statements
bind the exact tarball digest to each existing NaturalIntelligence repository's
`.github/workflows/publish.yml`, version tag and source SHA. GitHub read-back
shows successful publish runs by existing maintainer `amitguptagwl`:

- parser: `976470f6100eac10304d80507bbd76fb739ba7f5`
- builder: `d7d1d7b7e1ed90474b026d564f3ec7057a35fdec`
- strnum: `5aa0a504335d30d761c0b79865b40eb80da5a2ab`
- is-unsafe: `ed7a8d05b52cdc7e622354de28eb019229cef4b7`

The other four packages have registry signatures but no published optional
provenance. They retain the same maintainer/publisher and declared upstream
repositories. No changed package has an install, preinstall, postinstall or
prepare lifecycle hook. Upstream development/publish scripts are not consumer
install hooks. No patch/override/install-script modification is required.

## Generated output and local validation

`npm run prepare` produces `dist/index.js` and its source map. Complete source-map
content comparison attributes all 29 changed/new sources to the eight packages
above; no unrelated source content changed. The additional bundled anynum and
is-unsafe modules follow their declared strnum/entities imports. They are not
unexplained development-tool modules.

An independent raw ncc build normalizes byte-for-byte to the candidate bundle.
Acorn token-value comparison before/after normalization finds no literal changes
in updated dependency content. It identifies two pre-existing whitespace changes
in the unchanged @actions/core ID-token error templates, already present in the
base bundle; this update neither introduces nor changes those baseline strings.
The normalization script is unchanged. This is scoped evidence, not a claim
that the baseline normalizer preserves every upstream literal.

Node `v24.14.1` satisfies `.nvmrc` (`v24`). Clean `npm ci`, `npm run all`
(lint/build/55 tests), both full and production `npm audit` (zero findings), and
`git diff --check` pass. No baseline or introduced audit finding needs closure.
A post-commit clean rebuild, independent exact-head review, current-head CI and
merge-parent read-back remain mandatory before merge. Release evaluation must
inventory the complete v1.4.9-to-current-master set separately; runtime impact
exists before any version bump.
