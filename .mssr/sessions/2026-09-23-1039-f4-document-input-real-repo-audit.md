# Session — F4 document input + real repository audit

**Date:** 2026-09-23 10:39 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** F4 in progress; safe document-input boundary and deterministic draft renderer verified

## Objective

Continue from F3, reconcile stale durable documentation, begin F4 document preparation, and inspect what GitTeach already extracts from real repositories so the observed data is visible before polished README/portfolio generation exists.

## Initial state

F3 implementation was observable on disk in JS + Rust with shared schema tests, but `ROADMAP.md`, `PROJECT_STATE`, current-phase context, `HANDOFF.md` and the older F3 session still contained stale F2/F3 status. F4 had no explicit safe writing boundary yet.

## Decisions

- F0/F1/F2/F3 are treated as closed only because current code/tests prove their contracts.
- `giteach-document-input-v1` is the normal boundary between `DeveloperProfile v1` and any professional writer/renderer.
- Writers receive curated supported claims, evidence refs, bounded provenance summaries and review cautions; they do not receive raw repository dumps, evidence excerpts, arbitrary metadata or the full ledger.
- Missing support refs fail closed.
- The first renderer is deliberately deterministic and conservative. It may rephrase/format prepared claims but cannot mint a capability absent from `DocumentInput v1`.
- Repository/language/dependency counts remain evidence features, never expertise or seniority scores.

## Files touched

- `src/core/documents/DocumentPreparation.js` (new)
- `src/core/documents/DocumentDraftRenderer.js` (new)
- `src/core/index.js`
- `crates/giteach-core/src/document.rs` (new)
- `crates/giteach-core/src/lib.rs`
- `tests/core/document-preparation.test.js` (new)
- `tests/fixtures/document-input-v1-schema.json` (new)
- `ROADMAP.md`
- `.mssr/PROJECT_STATE.md`
- `.mssr/PROJECT_MEMORY.md`
- `.mssr/knowledge/phase/project-current-phase.md`
- `changelog/2026-09-23-evidence-profile-foundation.md`
- `.mssr/HANDOFF.md`
- this session file

Ephemeral runtime-only analysis files under `.mssr/runtime/` were used for the Kode scan/Jev canary and are not durable product authority.

## F4 implementation

`DocumentInput v1` exists in JS and Rust. Supported targets: GitHub profile README, project README summary, portfolio card, LinkedIn project/skills and CV evidence. It resolves support refs, emits bounded provenance and exposes stale/contradiction cautions.

The deterministic Markdown renderer accepts only `DocumentInput v1`. Tests prove it renders supported `TypeScript` evidence, does not introduce an absent `Kubernetes` capability and does not leak upstream metadata.

## Real collector observations

### GitTeach

- 239 files / 1,497,810 bytes scanned.
- 49 evidence records: 24 source, 16 documentation, 5 test, 3 manifest, 1 tooling.
- Repository counts: 171 source files, 45 docs, 5 tests, 3 manifests, 1 tooling file.
- Languages observed: JavaScript 160 files, Rust 10, HTML 6, PowerShell 1.
- Manifest technologies include Electron/Node dependencies plus the new Rust collector dependencies.

### Kode

- 249 files / 31,177,999 bytes scanned.
- 46 evidence records: 24 source, 16 documentation, 4 tooling, 2 manifest.
- Repository counts: 77 source files, 42 docs, 2 manifests, 4 tooling files.
- Languages observed: Rust 33 files, TypeScript 29, JavaScript 13, CSS 3, PowerShell 1, HTML 1.
- Manifest signals include Svelte/SvelteKit, Tauri, Monaco Editor, Mermaid, DOMPurify, pdfjs, Playwright and Rust networking/serialization/tooling crates.

## Live bounded Jev experiment — Kode

Using 24 bounded evidence records and explicit candidates:

- TypeScript programming: 0.97
- Rust programming: 0.76
- Tauri desktop application development: 0.97
- Svelte application development: 0.96
- Monaco Editor integration: 0.96
- Kubernetes cluster administration: 0.01 (negative control)

Provider/model: TypeSafe / `jev-1.13.0`. Usage: 16,261 input / 112 output tokens. Observed latency: 616 ms. The credential was retrieved ephemerally through `scripts/run-typesafe.ps1`; no secret value was printed or persisted.

This proves the semantic layer distinguishes several explicitly supplied supported candidates from a nearby negative control. It does not prove seniority. The 16k-token input is too broad for routine analysis, so the next optimization is candidate-specific deterministic evidence selection before Jev.

## Verification

- `npm run test:core`: PASS, 27/27.
- Rust unit tests: 11/11 PASS.
- Rust integration tests: 3/3 PASS (14 total).
- `cargo fmt --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- shared `DocumentInput v1` schema fixture: PASS in JS and Rust.
- `git diff --check`: PASS; existing LF→CRLF warnings only.

## Remaining work / next exact step

F4 remains open. Make the deterministic draft target-aware while preserving the `DocumentInput v1` firewall. In parallel implement deterministic candidate-specific evidence selection and benchmark it against the Kode 24-record / 16,261-token baseline; preserve TypeScript/Tauri/Svelte/Monaco positives and Kubernetes negative behavior before using it to build the first real multi-repository profile.

No commit or push was performed.
