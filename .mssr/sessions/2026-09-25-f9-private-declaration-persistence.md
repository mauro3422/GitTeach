# GitTeach F9.3a — private declaration persistence

**Date:** 2026-09-25  
**Trace:** `mssr-20260925050753-79957f3d-433`  
**Branch:** `rebuild/evidence-profile-core`

## Closed

- SQLite product schema advanced to v4 while preserving prior F9 repository and profile state.
- Direct private interview `user-answer` declarations now persist under the exact F9.2b actor matcher + unique repository set, bounded to 64 declarations per profile.
- Persisted declaration payload omits publication status, authorization refs and source hashes; reload always reconstructs the declaration as private.
- Approved declarations, profile imports, consent/source-hash metadata and profile-scope mismatches fail closed.
- Desktop save/load restores private answers after restart. A guided-profile generation token prevents stale async restore from overwriting a newer profile selection.
- Publication/approval remains hard-disabled during extended testing: no approval control in UI, JS policy is false, native Tauri publication command rejects, and persistence itself rejects Approved.
- The lower-level F8 publication contract remains testable but dormant and grants no current product permission.

## Verification

- `npm run test:core`: 232/232 PASS.
- Focused desktop-shell: 19/19 PASS.
- `cargo test --workspace --no-fail-fast`: 158/158 PASS (135 core + 6 collector + 1 audit + 2 lifecycle + 1 workspace + 2 technology evolution + 11 desktop).
- strict Clippy `-D warnings`, `cargo fmt --all -- --check`, Node syntax and `git diff --check`: PASS.
- QA remained headless.

## Next

Keep publication locked through extended testing. F9 can continue with semantic-cache persistence and retention/migration/cleanup without enabling consent/publication. Enabling durable publication consent requires a later explicit decision after sufficient tests.

No commit/push was requested.
