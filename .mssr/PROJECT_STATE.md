# Project State

## Reconstruction status

- Canonical repo: `D:\Dev\GitTeach`; canonical development branch: `main`.
- The pre-rebuild Electron baseline is preserved at `archive/legacy-electron-v2.89` and tag `legacy-electron-v2.89-final`; legacy runtime files are removed from the new main rather than duplicated beside the product.
- F0-F8 are closed and verified; F9 durable local persistence is active.
- Product remains desktop-first/local-first Tauri 2 + Rust and independent from Bridge/MSSR/OmnySys. The verified F9 UI is currently vanilla webview code; Svelte 5 + Vite is the intended presentation-layer modernization without changing Rust/core authority.

### Closed F9 slices

- **F9.1:** SQLite reconnectable repository connections + bounded remote audit commit/tree/path/blob identity.
- **F9.2a:** schema v2 bounded sanitized repository-derived snapshots; raw source/excerpts/hash/cache internals excluded; changed persisted HEAD invalidates the snapshot.
- **F9.2b:** schema v3 bounded personal-profile snapshots keyed to exact normalized actor matcher + unique repository set; repository-only/unresolved provenance cannot be promoted.
- **F9.3a:** schema v4 persists at most 64 direct private `user-answer` declarations for the exact persisted personal profile. Durable declaration payload omits `publicationStatus`, `authorizationRef` and `sourceHash`; reload reconstructs `publicationStatus=private`. Approved declarations fail closed.
- `save_private_profile_declaration` / `load_private_profile_declarations` restore private answers only for that exact actor/repository profile. Publication and approval permissions remain **hard-disabled** during extended testing in the UI, JS runtime policy and native Tauri command. Consent is not persisted or implicitly restored.
- Restored repository/profile/declaration state is continuity data, not freshness proof; current repository contents still require re-inspection.

### Latest verification — F9.3a

- JavaScript core: 232/232 PASS; focused desktop-shell: 19/19 PASS.
- Rust: 135 core + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 11 desktop = 158/158 PASS.
- v1/v2/v3→v4 migration, exact-profile declaration isolation, private-only enforcement, publication-lock defense in depth and privacy exclusions are tested.
- `cargo fmt --all -- --check`, strict Clippy `-D warnings`, Node syntax and `git diff --check`: PASS.
- QA remained headless; no commit/push was requested.

### Next

1. Keep publication locked while F9.3a reopen/scope/privacy behavior receives extended testing.
2. Persist semantic-cache identity/reuse with provider-policy/freshness invalidation.
3. Define retention/migration/cleanup for old snapshots, declarations and audit receipts.
4. Durable publication consent may be designed later only after explicit decision to leave the extended-test lock.

### Constraints

- No commit/push without explicit request.
- Raw remote source remains transient; cached derived state never proves freshness.
- Private answers remain private product state; no approval/publication permission is inferred from answering or restore.
- No seniority/quality percentage from counts, activity volume, technology history or provider probabilities.
