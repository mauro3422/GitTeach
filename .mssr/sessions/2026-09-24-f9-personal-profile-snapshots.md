# GitTeach F9.2b — personal profile snapshots

**Date:** 2026-09-24  
**Trace:** `mssr-20260924230518-e43fc63d-b3b`  
**Branch:** `rebuild/evidence-profile-core`

## Closed

- SQLite product schema advanced to v3 with migration from v1/v2 while preserving repository connections and v2 repository-derived snapshots.
- Added bounded `giteach-personal-profile-derived-snapshot-v1` persistence for the existing personal-profile inspection plane only.
- Snapshot identity uses the normalized exact actor matcher plus an order-independent unique repository-target set. Plaintext matcher values are not stored as profile payload and duplicate targets fail closed.
- Persisted personal state contains attributable capabilities, bounded repository evidence receipts, bounded actor-evidence provenance and inspection counts/omission metadata only. Repository-only or unresolved provenance cannot be promoted into the snapshot.
- Desktop `load_profile_snapshot` + **Restore saved profile** reuse `giteach-personal-profile-inspection-v1` after restart. Private declarations and publication approvals are deliberately reset and are not implied by restore.
- Restored personal profile state is last-known continuity data, not freshness proof; current repository contents still require re-inspection.

## Verification

- `npm run test:core`: 231/231 PASS.
- Focused desktop view-model: 18/18 PASS.
- `cargo test --workspace --no-fail-fast`: 154/154 PASS (132 core unit + 6 collector + 1 audit + 2 lifecycle + 1 workspace + 2 technology evolution + 10 desktop).
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: PASS.
- `cargo fmt --all -- --check`, Node syntax checks and `git diff --check`: PASS.
- QA remained headless.

## Next

Persist private declarations and explicit per-declaration publication consent without weakening the F8 approval firewall. Then persist semantic-cache identity/reuse and define retention/migration/cleanup policy.

No commit/push was requested.
