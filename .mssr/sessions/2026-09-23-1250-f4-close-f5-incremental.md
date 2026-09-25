# Session — F4 close + F5 incremental foundation

**Date:** 2026-09-23 12:50 -03:00  
**Branch:** `rebuild/evidence-profile-core`  
**Trace:** `mssr-20260923132744-b73460d8-632`

## Objective

Continue GitTeach from the verified F3/F4 boundary, show real repository data already available, finish the safe document-preparation phase, improve bounded Jev provenance/cost, and begin F5 incremental updates without commit/push.

## Initial state

- F0/F1/F2/F3 were closed.
- F4 had `DocumentInput v1` in JS/Rust and a deterministic renderer, but target coverage and real-repository semantics were not yet fully closed.
- Kode's earlier broad Jev canary used 24 evidence records / 16,261 input tokens and attached the same broad evidence set to accepted candidates.
- Collector source sampling was first-encounter order and did not recognize `.svelte` as a language/source type.

## Decisions

- Keep `DocumentInput v1` as the only normal professional-writing boundary; all target-specific rendering remains downstream of it.
- Treat candidate-specific evidence selection as deterministic retrieval/optimization, not semantic truth.
- Preserve fail-closed provenance: candidate refs must resolve inside the final bounded request.
- Explicit zero-ref candidates may not be accepted regardless of provider probability.
- Preserve language diversity inside the existing source-evidence budget rather than raising the budget.
- Start F5 with a deterministic reuse/invalidation plan before adding persistence/cache mechanics.

## Implementation

### F4 / semantic provenance

- Added deterministic candidate-specific evidence selector.
- Added optional candidate → evidence-ref mapping to the bounded Jev contract.
- TypeSafe questions now carry candidate-specific refs and accepted claims retain only those refs.
- Fixed a real global-budget bug where per-candidate refs could reference evidence dropped by `maxTotal`.
- Added explicit zero-ref guard so unsupported/no-match candidates cannot become accepted claims.
- Added target-aware deterministic rendering for all F4 target values.

### Collector hardening

- Reworked source-evidence sampling to preserve language diversity within the configured source budget.
- Added `.svelte` → `Svelte` source/language recognition.
- Added Rust regression coverage proving a bounded sample still contains multiple source languages.

### F5 incremental foundation

- Added `src/core/profile/IncrementalProfilePlanner.js`.
- Added Rust `crates/giteach-core/src/incremental.rs`.
- Added shared `giteach-incremental-profile-plan-v1` schema fixture.
- Planner outputs reusable skills, invalidated skills and whether new evidence requires discovery.
- Existing capabilities remain reusable only while all supporting evidence identities still resolve.

## Real repository observations

### Kode

Latest collector result:

- 249 files / 31,177,999 bytes scanned.
- 46 bounded evidence records.
- 102 source files, 42 docs, 2 manifests, 4 tooling files.
- Languages: Rust 33, TypeScript 29, Svelte 25, JavaScript 13, CSS 3, PowerShell 1, HTML 1.

Final bounded Jev canary after strict candidate provenance:

- TypeScript programming: 0.79.
- Rust programming: 0.85.
- Tauri desktop application development: 0.94.
- Svelte application development: 0.97.
- Monaco Editor integration: 0.97.
- Kubernetes negative control: unaccepted.
- 12 selected evidence records; accepted claims carry three refs each.
- Usage: 9,106 input / 112 output tokens; 747 ms.

This is substantially narrower than the earlier 24-record / 16,261-input-token baseline while preserving the expected positive/negative pattern. Narrower provenance also changed some probabilities; probabilities remain observations, not expertise scores.

### GitTeach

Latest collector result:

- 253 files / 1,662,309 bytes scanned.
- 51 evidence records.
- 177 source files, 48 docs, 7 tests, 3 manifests, 1 tooling file.
- Languages: JavaScript 167, Rust 11, HTML 6, PowerShell 1.

Bounded Jev canary accepted:

- JavaScript programming: 0.87.
- Evidence provenance system design: 0.85.
- TypeSafe Jev integration: 0.91.

Rust and Electron were not published by that bounded query because they did not pass the application acceptance gate with the selected evidence. This intentionally distinguishes structural repository facts from publishable semantic claims.

## Files touched in this iteration

Key source/tests:

- `src/core/providers/CandidateEvidenceSelector.js`
- `src/core/providers/JevContract.js`
- `src/core/providers/JevSemanticProvider.js`
- `src/core/providers/TypeSafeJevAdapter.js`
- `src/core/documents/DocumentDraftRenderer.js`
- `src/core/profile/IncrementalProfilePlanner.js`
- `src/core/index.js`
- `crates/giteach-core/src/collector.rs`
- `crates/giteach-core/src/incremental.rs`
- `crates/giteach-core/src/lib.rs`
- `crates/giteach-core/tests/repo_evidence.rs`
- `tests/core/candidate-evidence-selector.test.js`
- `tests/core/jev-contract.test.js`
- `tests/core/typesafe-jev-adapter.test.js`
- `tests/core/document-preparation.test.js`
- `tests/core/incremental-profile-planner.test.js`
- `tests/fixtures/incremental-profile-plan-v1-schema.json`

Durable docs/context:

- `README.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `.mssr/PROJECT_STATE.md`
- `.mssr/PROJECT_MEMORY.md` / selective contract module
- `.mssr/knowledge/decision/evidence-semantic-profile-contracts.md`
- `changelog/2026-09-23-evidence-profile-foundation.md`
- `.mssr/HANDOFF.md`
- this session file

## Verification

- `npm run test:core`: 40/40 PASS.
- Rust: 14 unit + 4 integration = 18/18 PASS.
- `cargo fmt --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- Shared JSON schema fixtures: PASS.
- `git diff --check`: PASS except pre-existing LF→CRLF informational warnings.
- Real TypeSafe/Jev calls executed through ephemeral Windows Credential Manager injection; secret not printed or persisted.

## Recovered issues

- Source evidence sampling could hide Rust in a mixed repo because the budget filled by traversal order; fixed with language-diverse bounded sampling.
- Per-candidate refs could exceed the final global evidence subset; contract correctly rejected this and selector now intersects refs with the final bundle.
- A zero-ref candidate could otherwise inherit broad fallback provenance; explicit zero-ref candidate provenance now cannot produce a claim.
- One Rust `lib.rs` patch conflicted after formatting changed exact text; the failed patch applied no mutation and was recovered with an exact line edit.

## Remaining / next exact step

Continue F5 by adding a persistent semantic observation cache keyed by candidate + exact evidence identity set. Reuse only exact-fresh matches; schedule Jev only for invalidated or newly discovered slices. Then run a real two-snapshot canary where one repository file changes and prove that only the dependent capability is re-judged.

Operational note: `.github/workflows/ci.yml` remains prepared locally, but the GitHub repository secret `TYPESAFE_API_KEY` was not previously confirmed as configured and no commit/push is authorized.

## Close state

F4 is closed. F5 is open with its first deterministic planner slice verified. No commit or push was performed.


## Context maintenance closeout

- Split F5 incremental contracts into `.mssr/knowledge/decision/incremental-profile-contracts.md` after project-context health reported 84% budget pressure on the combined F1-F5 module.
- `evidence-semantic-profile-contracts.md` now remains focused on F1-F4; `PROJECT_MEMORY.md` points to both selective modules.
- Added `incremental-profile-contracts` to `.mssr/project-context.json` so F5 context is loaded only for relevant intents.
