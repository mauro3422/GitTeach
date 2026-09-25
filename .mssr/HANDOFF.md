# GitTeach Handoff

## Current line

- Canonical development branch: `main`; F0-F8 are closed and verified.
- Pre-rebuild Electron recovery is preserved at `archive/legacy-electron-v2.89` plus tag `legacy-electron-v2.89-final`.
- F9 is active. F9.1 repository/audit identity, F9.2a repository snapshots, F9.2b personal-profile snapshots and **F9.3a private declaration persistence** are closed.
- Product remains local-first Tauri 2 + Rust; remote source hydration is transient. The current verified webview is vanilla HTML/CSS/JS; Svelte 5 + Vite is the next presentation-layer modernization and must preserve existing Rust/Tauri command and privacy contracts.
- Latest functional receipt remains `.mssr/sessions/2026-09-25-f9-private-declaration-persistence.md`. Main promotion is now complete: rebuild is authoritative on `main`, Electron is archived for recovery, and CI fix commit `00f62d4cdbcb813ff49c8c049cfcd579000fd9f8` is published.

## Stable boundaries

- F4 owns `DocumentInput`; F6 owns declaration/publication contracts; F7 owns presentation/widget handoff.
- SQLite schema v4 preserves prior F9 state and stores at most 64 direct private `user-answer` declarations under the exact F9.2b actor + repository-set profile identity.
- Durable declaration JSON excludes `publicationStatus`, `authorizationRef` and `sourceHash`; loading always reconstructs `publicationStatus=private`. Approved declarations are rejected by persistence.
- Desktop save/load restores those private answers after restart. Publication/approval is deliberately **disabled** in UI, JS `PROFILE_PUBLICATION_ENABLED=false`, and the Tauri `generate_profile_outputs` gate. The lower-level F8 publication contract remains regression-tested for later use but grants no current product permission.
- Cached/restored data is continuity state, not freshness proof. Re-inspect before relying on repository state.

## Verification

- JavaScript core 232/232; focused desktop-shell 19/19; Rust 158/158 PASS.
- Rust breakdown: 135 core + 6 collector + 1 audit + 2 lifecycle + 1 workspace + 2 evolution + 11 desktop.
- v1/v2/v3→v4 migration, exact-profile scoping, private-only declaration persistence, approval rejection, and publication-lock defense in depth are tested.
- fmt, strict Clippy `-D warnings`, Node syntax and `git diff --check`: PASS. QA headless.

## Active — F9

1. Keep the publication gate locked through extended F9.3a testing.
2. Next safe work can be semantic-cache persistence and retention/cleanup policy without enabling publication.
3. Publication-consent persistence/enablement is deferred until an explicit later decision after sufficient tests.

No commit/push without Mauro's explicit request.
