# Session — F2 TypeSafe adapter

**Date:** 2026-09-23 08:49 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** TypeSafe transport-adapter slice closed; F2 live canary pending

## Objective

Resume GitTeach from the durable F2 contract-readiness state, locate the missing local TypeSafe/Jev guidance in global skills / related documentation, implement only the provider contract supported by authoritative guidance, and preserve provenance and the GitTeach/OmnySys boundary.

## Initial state

F0/F1 were closed. `giteach-jev-bounded-v1` existed with evidence-ref and confidence validation, but live TypeSafe wiring had not started because the previous bounded search had missed the global `typesafe-ai` skill.

## Discovery

- Bridge changelog evidence identified `C:\Users\mauro\.codex\skills\typesafe-ai\SKILL.md`.
- The path is a runtime junction to the owned skill source; it was read without modifying the skill.
- The skill explicitly requires current TypeSafe live docs as source of truth.
- Current TypeSafe docs confirm `POST https://api.typesafe.ai/v1/systemone`, model + state + typed questions, and Choice/Score/Noul response contracts.
- Important correction: Jev is a structured decision model, not a free-text skill generator. GitTeach must provide candidate capability labels.

## Decisions

- Preserve `giteach-jev-bounded-v1` as the provider-neutral boundary.
- Add explicit `candidates` to the bounded request.
- Reject provider claims outside the supplied candidate set.
- Use one Noul per candidate over the same bounded evidence state.
- Keep the acceptance threshold in application code; default is 0.75 and must be evaluated with real data rather than treated as universal truth.
- A positive candidate currently cites the complete bounded evidence set. This is conservative provenance, not minimal attribution; finer evidence selection is a future refinement.
- Keep API key handling environment-only and never record the key.

## Files touched

- `src/core/providers/JevContract.js`
- `src/core/providers/JevSemanticProvider.js`
- `src/core/providers/TypeSafeJevAdapter.js` (new)
- `src/core/index.js`
- `tests/core/jev-contract.test.js`
- `tests/core/typesafe-jev-adapter.test.js` (new)
- `.mssr/PROJECT_STATE.md`
- `.mssr/PROJECT_MEMORY.md`
- `.mssr/knowledge/phase/project-current-phase.md`
- `changelog/2026-09-23-evidence-profile-foundation.md`
- `.mssr/HANDOFF.md`
- this session file

## Tests and results

- `npm run test:core`: PASS, 18/18.
- `cargo test --workspace`: PASS, 8/8.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only existing LF→CRLF warnings.
- Adapter coverage: successful candidate mapping, no-candidate abstention, below-threshold abstention, malformed Noul output, HTTP 429 propagation, timeout.
- One intermediate test run failed because Bridge read metadata was accidentally written into a test while appending. The test file was immediately reconstructed from the previously read source plus the intended new case; the full suite then passed 18/18.

## Live canary

Not executed. Presence-only environment check returned `TYPESAFE_API_KEY=absent`. No credential value was read, logged or persisted.

## Blockers / pending

F2 overall remains open because mocks do not prove the hosted provider contract. The transport adapter itself is closed by tests.

The current provenance mapping for accepted candidates uses all evidence refs in the bounded request. This is valid and resolvable but intentionally conservative; minimal per-claim evidence attribution can be designed after the first provider canary.

## Next exact step

Make `TYPESAFE_API_KEY` available to the GitTeach execution environment without storing it in the repository. Run one live canary with a very small explicit candidate set containing at least one clearly supported and one clearly unsupported capability. Record only model, usage, probabilities, latency and pass/fail. If the contract holds, close F2; if not, preserve the observed mismatch and patch only that mismatch.

No commit or push was performed.
