# Session — F5 Git identity ActorEvidence + profile join

**Date:** 2026-09-23 15:36 -03:00  
**Branch:** `rebuild/evidence-profile-core`  
**Trace:** `mssr-20260923180304-048ef62a-73a`

## Goal

Implement the first real trustworthy `ActorEvidence v1` producer from explicitly configured Git identities and connect separate ActorEvidence to `DeveloperProfile` without turning Git authorship into manual-code authorship or letting one actor's evidence promote another actor.

## Initial state

- Repository facts, project semantics and personal experience were already separate authority layers.
- `giteach-actor-evidence-v1` existed in JS/Rust but had no real producer and was intentionally not joined into the profile.
- Existing attribution metadata inside repository evidence was only a transitional compatibility mechanism.
- The durable direction required Git identity to establish `identity-linked` contribution only.

## Decisions

1. Reuse GitTeach's existing `git` executable pattern instead of introducing `git2`.
2. Git identity matching is explicit configuration only: actor key + accepted names/emails. Repository ownership is not identity evidence.
3. Git may emit only `authored-change` or explicit `coauthored-change`.
4. Git-derived implementation origin is always `unknown` unless a stronger independent source establishes otherwise.
5. A commit may attach only to exact evidence IDs whose normalized paths were actually changed by that commit and are present in the bounded `RepoEvidenceBundle`.
6. Matching commits with no surviving bounded evidence path emit no ActorEvidence.
7. Explicit profile attribution requires a subject actor key. ActorEvidence for another actor must never elevate the subject profile.
8. Unknown ActorEvidence target refs fail closed.
9. The legacy evidence-metadata attribution path remains only for compatibility when explicit ActorEvidence mode is absent.

## Implementation

### Rust Git producer

Added `crates/giteach-core/src/git_actor.rs` with:

- `GitActorIdentity`
- `GitActorEvidenceOptions`
- `GitActorEvidenceError`
- `collect_git_actor_evidence()`

The producer reads bounded Git history, recognizes configured authors and `Co-authored-by:` trailers, intersects changed paths with current repository evidence, and emits deterministic `ActorEvidence v1` records with `sourceKind = git` and `implementationOrigin = unknown`.

### Profile join

JavaScript `ProfileAggregator.build()` now accepts optional `actorKey` + `actorEvidence`. In explicit actor mode it validates schema/target refs, filters by exact actor, supporting repository and capability/evidence attachment, then derives attribution from ActorEvidence rather than repository metadata.

Rust adds `build_developer_profile_with_actor_evidence()` with the same fail-closed subject/target rules while retaining `build_developer_profile()` as the compatibility wrapper.

### Shared actor helpers

Rust `ActorRelation` and `ImplementationOrigin` now expose stable string representations for cross-boundary attribution/provenance handling.

## Files touched

- `crates/giteach-core/src/git_actor.rs` (new)
- `crates/giteach-core/src/actor.rs`
- `crates/giteach-core/src/profile.rs`
- `crates/giteach-core/src/lib.rs`
- `src/core/profile/AttributionPolicy.js`
- `src/core/profile/ProfileAggregator.js`
- `tests/core/profile-evidence.test.js`
- `.mssr/PROJECT_MEMORY.md`
- `.mssr/PROJECT_STATE.md`
- `.mssr/knowledge/decision/experience-attribution-contracts.md`
- `.mssr/knowledge/decision/actor-evidence-sources.md`
- `.mssr/knowledge/phase/project-current-phase.md`
- `changelog/2026-09-23-evidence-profile-foundation.md`
- `.mssr/HANDOFF.md`

## Verification

- `npm run test:core`: 54/54 PASS.
- Rust unit tests: 24/24 PASS.
- Rust integration tests: 4/4 PASS.
- Rust total: 28/28 PASS.
- `cargo fmt --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; existing LF→CRLF warnings only.
- End-to-end Rust test proves `Git commit → ActorEvidence → DeveloperProfile` remains `identity-linked` with origin `unknown`.
- JS test proves another actor's `agent-direction` evidence cannot elevate the configured subject profile.

## Limitations

- Git attribution is intentionally weak evidence. It does not establish who manually typed/generated the implementation, who designed it, or who exercised engineering judgment.
- The first stronger agency producer is not implemented yet.
- GitHub review/PR, ADR/design, debugging, testing and maintenance producers remain pending.
- F5 semantic observation cache + real two-snapshot selective-invalidation canary remain pending.

## Exact next step

Implement a privacy-bounded MauroPrime/Bridge/MSSR → ActorEvidence adapter using observable lifecycle receipts only. It should map direction/corrections/debugging/verification/accepted outcomes to agency relations when justified, keep raw prompts/transcripts/credentials/hidden reasoning out of profile evidence, attach to exact repository/capability/evidence refs, and fail closed when actor or attachment is ambiguous. Then continue the F5 semantic cache/two-snapshot canary.

No commit or push requested.

## Context maintenance closeout

- Postflight detected `actor-evidence-sources.md` above its modular context budget.
- Split durable knowledge into `actor-evidence-sources.md` (producer/source rules) and new `actor-evidence-quality.md` (quality/privacy/cross-actor isolation rules), both registered in `.mssr/project-context.json`.
- Compacted `.mssr/PROJECT_STATE.md` by removing historical repository observations already preserved elsewhere, keeping the state module focused on current verified status and next action.
