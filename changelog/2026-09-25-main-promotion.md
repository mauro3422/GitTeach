# 2026-09-25 — Rebuild promoted to canonical main

Type: milestone

## Summary

GitTeach's evidence-profile rebuild becomes the canonical development line. The pre-rebuild Electron/Designer product remains recoverable through Git history and explicit archive refs instead of remaining mixed into the active tree.

## Git / repository cleanup

- Preserve the former Electron baseline at branch `archive/legacy-electron-v2.89` and annotated tag `legacy-electron-v2.89-final`, both rooted at `bf45f18`.
- Remove the active Electron runtime (`src/main`, `src/preload`, `src/renderer`) plus legacy local model binaries, Designer reports/tests/tooling, obsolete helper scripts and stale active documentation from the rebuild branch.
- Keep historical implementation material only under `docs/archive/`, `docs/legacy/`, and Git history.
- Ignore `.mssr/runtime/` so execution logs/scans remain ephemeral instead of polluting the canonical repository.
- Preserve `src/core/` independence: no import/reference path points back into the removed Electron runtime.

## Canonical runtime

- Desktop/local-first runtime is Tauri 2 over the Rust core (`crates/giteach-core` + `crates/giteach-desktop`).
- The verified F9 webview remains vanilla HTML/CSS/JS for this promotion milestone.
- Svelte 5 + Vite is the next presentation-layer modernization. It may replace the webview UI implementation but must preserve the existing Tauri command surface, Rust-owned repository/profile truth, SQLite persistence boundaries, privacy rules, and publication lock.

## Safety boundary

- Publication/approval remains hard-disabled while F9 persistence receives extended testing.
- Private interview answers remain exact-profile-scoped local state and never imply publication consent.

## Verification

Before promotion, the full rebuild gate completed successfully:

- JavaScript core: 232/232 PASS.
- Rust workspace: 158/158 PASS.
- strict Clippy (`-D warnings`): PASS.
- `cargo fmt --all -- --check`: PASS.
- Node syntax checks for desktop webview sources: PASS.
- `git diff --check`: PASS.
- `src/core` legacy import check: no references to `src/main` or `src/renderer`.

## Cross-platform CI follow-up

- The first Ubuntu CI run reached the Rust/Tauri compile after all 232 JavaScript tests passed and exposed one packaging omission: Tauri's generated context expects `crates/giteach-desktop/icons/icon.png` on Linux.
- Added a 256x256 PNG derived from the existing canonical `icon.ico`; this is packaging metadata only and does not change product/runtime contracts.
- The follow-up Ubuntu run then passed the complete `core` job: JavaScript core tests, `cargo test --workspace`, and strict workspace Clippy all succeeded.
- Its only remaining red job was the optional live TypeSafe canary failing on an absent repository secret. CI now emits a notice and skips that live canary when `TYPESAFE_API_KEY` is unavailable, while preserving the real canary path when the secret is configured.

## Recovery note

A Bridge workspace snapshot was attempted before cleanup but the global snapshot store was already at capacity. No unrelated snapshots were deleted. Recovery therefore relies on the explicit archive branch/tag plus normal Git history, which preserve the complete pre-rebuild commit.
