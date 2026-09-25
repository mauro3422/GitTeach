# Session — F3 DeveloperProfile v1 aggregation slice

**Date:** 2026-09-23 09:51 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** F3 aggregation contract slice implemented and verified; Rust profile port remains next

## Objective

Begin F3 from the closed F2 state. Extend the cross-repository profile so repeated capabilities preserve independent-repository support, evidence diversity, recency, contradictions and explicit stale evidence without converting frequency or confidence into an expertise/seniority score.

## Initial state

F0/F1/F2 were closed. The real TypeSafe canary had already succeeded and `.mssr/PROJECT_STATE.md` recorded that result. `ProfileAggregator` already grouped claims by skill and preserved evidence refs, but did not expose the full F3 dimensions.

The phase module was stale and still described the pre-canary F2 blocker; this session reconciles it to current state.

## Decisions

- Keep `giteach-developer-profile-v1` as the public schema.
- Treat claim stance as explicit `support` or `contradict`; default remains `support`.
- Reject unknown stance values instead of guessing.
- Count independent supporting repositories separately from raw evidence count.
- Evidence diversity is the set of supporting evidence kinds, not an expertise metric.
- Recency is represented by latest supporting evidence observation time.
- Staleness is only derived from explicit `claim.stale`, `metadata.stale`, or `metadata.freshness === "stale"`; age alone does not silently make evidence stale.
- Contradictions remain first-class provenance-bearing observations.
- Do not add expertise scores, seniority labels or frequency-derived ranking.
- Keep this slice in the JS profile scaffold for compatibility; the next F3 slice should establish the Rust-first durable profile contract rather than silently duplicating it.

## Files touched

- `src/core/profile/ProfileAggregator.js`
- `tests/core/profile-evidence.test.js`
- `ROADMAP.md`
- `.mssr/PROJECT_STATE.md`
- `.mssr/knowledge/phase/project-current-phase.md`
- `changelog/2026-09-23-evidence-profile-foundation.md`
- `.mssr/HANDOFF.md`
- this session file

## Verification

- `npm run test:core`: PASS, 20/20.
- `cargo test --workspace`: PASS, 8/8.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only existing LF→CRLF warnings.

New tests prove independent repository count, evidence diversity, latest evidence timestamp, explicit stale evidence, contradiction preservation and absence of expertise/seniority fields. Unsupported stance values fail closed.

## Remaining work

F3 is not closed yet. The next durable slice is the Rust-first `DeveloperProfile v1` contract/aggregator, followed by JS↔Rust interchange parity. After that, add richer contradiction/freshness policies only from explicit evidence; do not infer expertise from counts.

No commit or push was performed.
