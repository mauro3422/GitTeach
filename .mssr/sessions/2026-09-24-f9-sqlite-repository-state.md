# 2026-09-24 — F9.1 SQLite repository state

- Trace: `mssr-20260924213240-c1b1ca3a-51f`
- Branch: `rebuild/evidence-profile-core`
- Scope: first F9 durable local persistence slice; no commit/push requested.

## Closed

- Added `SqliteProductStore` schema v1 in `giteach-core`.
- Tauri app-local `giteach-product.sqlite3` now retains successful local/remote repository connection identity and bounded refresh/coverage summary.
- Remote product state retains audit commit/tree/path/blob identity while raw hydrated source bodies and temporary cache/object-store paths remain transient.
- Successful desktop analyze/inspect upserts the connection.
- Added bounded `giteach-repository-connection-list-v1`; remembered repositories load on startup and can be re-selected into the current profile session.
- Re-selection restores only `RepositoryTarget`, never ActorEvidence/declarations/publication consent implicitly.

## Verification

- `npm run test:core`: 231/231 PASS.
- Focused desktop view-model suite: 18/18 PASS.
- `cargo test --workspace --no-fail-fast`: 146/146 PASS total.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: PASS.
- `cargo fmt --all -- --check`: PASS.
- Node syntax checks: PASS.
- `git diff --check`: PASS.

## Next

Continue F9 with bounded analysis/evidence/profile snapshots, then private declarations/publication consent and semantic-cache identity/reuse. Define retention/migration cleanup after those contracts are stable. WidgetForge remains F12 and external adapters F11.
