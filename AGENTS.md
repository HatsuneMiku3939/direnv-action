# Project Overview
This repository contains a JavaScript-based GitHub Action that installs `direnv`, evaluates a target `.envrc`, and exports resulting environment variables (including special handling for `PATH`) to subsequent workflow steps while optionally masking selected values.

## Project Map
```text
.
├── action.yml                 # GitHub Action metadata, inputs, runtime entrypoint
├── index.js                   # Action implementation and exported helpers
├── index.test.js              # Jest unit tests with mocked @actions modules
├── dist/                      # Bundled artifact consumed by GitHub Actions runtime
├── package.json               # npm scripts and dependency definitions
├── eslint.config.js           # ESLint flat config
├── README.md                  # Usage, behavior, security, and development notes
└── RELEASE_RUNBOOK.md         # Manual release process documentation
```

## Core Behaviors & Patterns
- The action entrypoint (`main`) follows a fixed flow: install tool -> allow `.envrc` -> export JSON -> apply env vars -> mask secrets.
- Binary resolution is explicit by `platform/arch` through `direnvBinaryURL`, with hard failures for unsupported targets.
- Installation prefers GitHub tool-cache, then actions/cache restore, then direct download, and finally rehydrates both caches.
- `PATH` from exported env is appended via `core.addPath`; all other keys are exported via `core.exportVariable`.
- Tests are unit-focused and rely on `jest.unstable_mockModule` to isolate GitHub Actions SDK and command execution side effects.

## Development Commands
- Install dependencies: `npm ci`
- Lint: `npm run lint`
- Unit tests: `npm test`
- Build distributable bundle: `npm run prepare`
- Full local gate (lint + build + tests): `npm run all`

## Coding Conventions
- Tech stack: Node.js ESM modules, GitHub Actions toolkit packages, Jest, ESLint.
- Keep functions small and composable; prefer pure helpers for branchable logic (e.g., URL/build decisions).
- Preserve explicit error messages for unsupported platforms/architectures and propagate normalized failure text via `core.setFailed`.
- Keep test cases table-driven where practical (`test.each`) and mock external side effects.
- Generated `dist/` should be produced from source via `npm run prepare`; do not hand-edit bundled output.

## Agent Guardrails
- Always run `npm run lint` and `npm test` before proposing changes; run `npm run all` for release-affecting updates.
- If source behavior changes, update tests in `index.test.js` and relevant documentation (`README.md`, runbooks) in the same change.
- Keep `action.yml` entrypoint aligned with bundled output (`dist/index.js`) after build-related edits.
- Do not introduce unsupported platform/arch mappings without matching implementation and tests.
- > TODO: Confirm branch protection, PR label policy, and required CI checks from repository settings.
