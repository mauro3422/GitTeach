# Session — F5 incremental Jev persistence close

**Date:** 2026-09-23 21:45 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** F5 closed and verified; F6 next

## Objective

Close the remaining F5 semantic-cache work without turning Jev into a general repository search engine: persist bounded semantic observations per candidate + exact model-visible evidence identity, reuse unchanged judgments, refresh only affected candidates and prove the behavior against real Kode evidence/TypeSafe.

## Implemented

- Added JS `IncrementalJevSemantics` with `giteach-jev-observation-v1` and `giteach-incremental-jev-plan-v1`.
- Semantic atoms are now one candidate + only that candidate's selected evidence.
- Input fingerprint includes bounded request contract, candidate/refs, exact evidence identity plus digest of excerpt text Jev saw, question, semantic context and provider-policy identity.
- Actions: `reuse`, `refresh`, `skip-no-evidence` with explicit reasons.
- Unrelated new evidence outside a candidate slice does not invalidate it; exact evidence-content changes do.
- TypeSafe wording was corrected to project capability/characteristic rather than developer authorship/skill.
- Provider-policy key includes TypeSafe decision contract, requested model and acceptance threshold.
- Added bounded `maxObservationAgeMs`; expired exact observations refresh with `provider-refresh-due`. This bounds long-lived reuse for floating provider aliases.
- Added shared Rust observation/planner contracts and shared observation schema fixture.
- Added `giteach-jev-observation-store-v1` JSON adapters in JS/Rust. They preserve historical changed observations; the JS store rejects raw excerpts in persisted evidence identity. JSON is a local CLI/dev adapter, not the product database contract.
- Added shared store schema fixture.
- Added live and cross-process canary scripts.

## Real Kode canaries

Candidates: `Rust`, `Monaco`, `Kubernetes`; selected evidence: 3 Rust refs + 3 Monaco refs; Kubernetes had no selected evidence.

First live bounded pass:
- 2 TypeSafe calls;
- Rust support probability 0.98;
- Monaco support probability 0.97;
- Kubernetes skipped without provider call;
- 4,707 input / 44 output tokens across the two observations;
- ~1.66 s wall time in the recorded run.

Exact second pass:
- 0 TypeSafe calls;
- Rust + Monaco reused.

Changed only one Rust evidence excerpt while keeping the same ref:
- 1 TypeSafe call;
- Rust refreshed with `evidence-changed`;
- Monaco reused with `exact-input-match`;
- Kubernetes remained `no-candidate-evidence`.

Cross-process JSON-store proof:
- `seed`: 2 calls, store=2 observations;
- a fresh `node ... reuse` process without Credential Manager/API key: 0 calls, store still 2;
- `rust-change`: 1 call, store grows to 3 historical observations.

A live `/v1/models` probe returned provider model names `jev-latest` and `jev-preview`; actual SystemOne responses identify concrete model versions. Because a floating alias may change outside GitTeach, long-lived reuse is explicitly age-bounded rather than assumed immutable.

The probabilities above are bounded support judgments about the project evidence, never developer skill levels.

## Verification

- JavaScript: 138/138 PASS.
- Rust: 66 unit + 5 collector integration + 2 lifecycle integration = 73/73 PASS.
- Shared JS/Rust observation + store schema fixtures PASS.
- `cargo fmt --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS (known Windows LF→CRLF warnings only).
- Credential remains Windows Credential Manager-only and is never written to observation/store artifacts.

## Next

F6: bounded user/profile-source declarations + conversational profile interviewer. Reconcile observed vs declared context without treating `not observable` as false, then expose curated profile state to documents and WidgetForge.

No commit or push was performed.
