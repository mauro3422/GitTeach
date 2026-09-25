# Current phase

## Active line

- Branch `rebuild/evidence-profile-core`; F0-F8 closed and verified.
- F9 durable local persistence is active. F9.1, F9.2a, F9.2b and **F9.3a private declaration persistence** are closed and verified.
- Product remains local-first Tauri 2/webview over Rust; F4/F6/F7 authority boundaries are unchanged.
- Remote repository source hydration is bounded/transient. Restored product state is continuity data, not freshness proof.
- F9.3a gate: JavaScript 232/232, focused desktop-shell 19/19, Rust 158/158, fmt, strict Clippy `-D warnings`, Node syntax and diff-check PASS. QA headless.

## Product boundary

SQLite v4 may restore direct private interview answers only for the exact persisted personal profile. The declaration payload excludes consent/source-authorization metadata and reloads as `private`. Publication/approval permissions are intentionally locked in UI, JS policy and native Tauri while this path receives extended testing. The dormant F8 publication contract is not current product permission.

## Active — F9

1. **Closed F9.1:** reconnectable repository/audit identity.
2. **Closed F9.2a:** bounded repository-derived snapshots.
3. **Closed F9.2b:** bounded exact-profile personal snapshots.
4. **Closed F9.3a:** bounded exact-profile private `user-answer` declarations; publication locked.
5. Next safe slices: semantic-cache persistence and retention/migration/cleanup while keeping publication locked.
6. Publication consent persistence/enablement remains deferred until explicit later approval after extended tests.

## Constraints

- No commit/push without explicit request.
- Runtime cannot require Bridge/MSSR/OmnySys.
- Actor evidence cannot cross identity scopes.
- No secrets, raw prompt transcripts, hidden reasoning or raw remote source in product/profile persistence.
- Answering/restoring a declaration never grants publication permission.
