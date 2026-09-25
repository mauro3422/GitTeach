# Session — F1 provenance bridge

**Date:** 2026-09-23 02:41 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** F1 closed; F2 provider wiring not started

## Objective

Close the remaining deterministic F1 boundary by converting Rust `RepoEvidenceBundle v1` output into the existing JavaScript `EvidenceLedger` without semantic interpretation.

## Starting state

F0 and the Rust collector were verified. The remaining F1 task was the bundle-to-ledger bridge. TypeSafe live API guidance was still unavailable, so F2 could not safely start.

## Decisions

- Preserve collector evidence IDs instead of minting a second identity at the JS boundary.
- Map repository head commit/time into ledger commit/observedAt.
- Preserve source/excerpt hashes and bounded excerpts.
- Reject incompatible bundle schemas explicitly.
- Keep the adapter deterministic and semantics-free.

## Files touched

- `src/core/evidence/RepoEvidenceAdapter.js`
- `src/core/index.js`
- `tests/core/repo-evidence-adapter.test.js`
- `ROADMAP.md`
- `changelog/2026-09-23-evidence-profile-foundation.md`
- `.mssr/PROJECT_STATE.md`, `.mssr/PROJECT_MEMORY.md`
- `.mssr/knowledge/phase/project-current-phase.md`
- `.mssr/HANDOFF.md` and this session file

## Verification and results

- `npm run test:core`: PASS, 6/6.
- `cargo test --workspace`: PASS, 8/8.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only existing CRLF conversion warnings.
- Real end-to-end canary: collector serialized GitTeach to `RepoEvidenceBundle v1`, adapter imported 47/47 records, and every evidence ID was preserved.

An initial fixture used a deliberately fake excerpt hash and correctly exposed that `EvidenceLedger` recomputes hashes when an excerpt is present. The fixture was corrected to the real SHA-256; production Rust output already emits matching excerpt hashes.

## Blockers / pending

Authoritative `typesafe-ai` SDK/API guidance remains missing locally. No provider credentials or network calls were used. F2 is therefore not marked started.

## Next exact step

Locate/load authoritative TypeSafe live API guidance. Then define a falsifiable bounded Jev contract (request, response, abstention, evidence refs, provider/model metadata and failure behavior) and test it locally before any real provider call.
