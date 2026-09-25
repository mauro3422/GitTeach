# GitTeach F9.2a — derived repository snapshots

**Date:** 2026-09-24  
**Trace:** `mssr-20260924223557-b7e596d3-16a`  
**Branch:** `rebuild/evidence-profile-core`

## Closed

- SQLite product schema advanced from v1 to v2 with migration preserving existing repository connections.
- Added bounded `giteach-repository-derived-snapshot-v1` keyed to repository connection + committed HEAD.
- Snapshot stores safe analysis/coverage, languages/technologies, bounded evidence receipts and deterministic domain provenance only.
- Raw source/excerpts, arbitrary evidence metadata, source/excerpt/hydration hashes and audit-cache/object-store paths are not persisted in this derived snapshot.
- Changing persisted committed HEAD invalidates stale derived state.
- Desktop `load_repository_snapshot` + `Restore view` restore the existing repository-inspection contract after restart without recreating ActorEvidence, declarations or publication consent.
- A restored view is last-known state, not freshness proof; local uncommitted changes require re-inspection even when HEAD is unchanged.

## Verification

- `npm run test:core`: 231/231 PASS.
- focused desktop view-model: 18/18 PASS.
- `cargo test --workspace --no-fail-fast`: 149/149 PASS (128 core + 6 collector + 1 audit + 2 lifecycle + 1 workspace + 2 technology evolution + 9 desktop).
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: PASS.
- Node syntax checks + `git diff --check`: PASS.
- QA was headless.

## Next

Persist bounded personal-profile derived snapshots by stable actor + repository-set identity while preserving exact attribution. F9 remains open for declaration/publication-consent persistence, semantic-cache reuse and retention/migration policy.

No commit/push was requested.
