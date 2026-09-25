# F9 local product persistence

## Verified boundary

- `giteach-core` owns app-local `SqliteProductStore` at `giteach-product.sqlite3`; `user_version` is explicit and unknown future versions fail closed.
- **F9.1:** reconnectable repository rows + bounded remote audit commit/tree/path/blob identity.
- **F9.2a:** schema v2 bounded repository-derived snapshots; raw source/excerpts/hash/cache internals excluded; changed persisted HEAD invalidates them.
- **F9.2b:** schema v3 bounded personal-profile snapshots keyed to normalized exact actor matcher + order-independent unique repository set; repository-only/unresolved provenance fails closed.
- **F9.3a:** schema v4 stores at most 64 direct private `user-answer` `ProfileDeclaration v1` rows for that exact persisted personal profile. Persisted declaration JSON contains declaration content/scope only and omits `publicationStatus`, `authorizationRef` and `sourceHash`; reload reconstructs `publicationStatus=private`. Approved declarations, profile imports, authorization/source-hash metadata and actor-scope mismatch are rejected.
- v1/v2/v3 migrate to v4 without losing earlier repository/profile state.
- Derived/personal state still excludes raw remote source, excerpts, arbitrary evidence metadata, source/excerpt/hydration hashes and cache/object-store paths.

## Desktop/webview boundary

- Repository/profile snapshot restore remains last-known continuity data, never freshness proof.
- `save_private_profile_declaration` writes an interview answer only after its exact personal-profile snapshot exists; `load_private_profile_declarations` uses the same exact actor/repository identity.
- The webview reloads those private answers after restart and presents them as **Private · saved locally · publication disabled**.
- Publication permission is defense-in-depth locked: no approval checkbox in UI, JS `PROFILE_PUBLICATION_ENABLED=false`, and native `generate_profile_outputs` rejects publication. Persistence itself also rejects `Approved`, so changing only the UI cannot grant consent.
- The lower-level F8 explicit-publication contract remains regression-tested for future use but is not enabled product behavior.

## Verification

- JavaScript core 232/232; focused desktop-shell 19/19; Rust 158/158 PASS (135 core + 6 collector + 1 audit + 2 lifecycle + 1 workspace + 2 evolution + 11 desktop).
- Tests cover v1/v2/v3→v4 migration, restart round-trip, exact-profile isolation, max/private declaration policy, approval rejection, and absence of consent/auth/source-hash metadata in persisted declaration JSON.
- fmt, strict Clippy `-D warnings`, Node syntax and `git diff --check`: PASS. QA headless.

## Remaining F9

1. Extended-test F9.3a while publication remains locked.
2. Persist semantic-cache identity/reuse with provider-policy/freshness invalidation.
3. Define retention/migration/cleanup for historical snapshots, declarations and audit receipts.
4. Publication-consent persistence/enablement is deferred until explicit later approval after sufficient tests.
