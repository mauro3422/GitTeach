# Session — F8 local-first product start

**Date:** 2026-09-24 13:00 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** F8 redirected to local-first product; F8.1 repository workspace implemented and verified; F8 remains open

## History recovery

Git history was initially shallow, so the full remote history was fetched before making product decisions. The root commit `bce98b4` confirms GitTeach already began as an Electron desktop application.

Legacy repository acquisition was inspected directly from historical commits rather than inferred from deleted files. The old product used GitHub REST repository trees plus Contents API file downloads. `RepositoryCacheManager`/cache services stored repository tree SHA and per-file SHA/summary/snippet, and later offline/cache-first work reused unchanged snippets. The useful cache identity concept is retained, but the old REST-per-file scanner and Electron runtime remain reference-only.

## Product redirect

GitTeach is now desktop-first/local-first:

- planned shell: Tauri 2 + webview over the Rust core;
- no hosted analysis server required for the primary flow;
- existing local repositories are analyzed in place;
- remote repositories live in an app-owned persistent Git workspace: clone once, fetch/fast-forward later;
- source/history uses Git transport rather than GitHub REST per-file downloads;
- GitHub REST remains for account/repository metadata plus Releases/PRs/reviews/issues behind the current serialized conditional-cache/rate-limit boundary;
- external profile adapters are deferred to F11;
- concrete WidgetForge rendering is deferred to F12 while F7 contracts remain stable.

## F8.1 implementation

Added Rust `giteach-repository-workspace-v1`:

- safe cache paths keyed by owner/repository;
- initial `git clone --filter=blob:none --origin origin`;
- later `git fetch --prune --tags origin` + `merge --ff-only origin/<branch>`;
- `Cloned`, `Updated` and `Unchanged` observable states;
- rejects managed-path origin mismatch and detached-HEAD refresh;
- rejects HTTP clone URLs containing embedded credentials.

A real local bare-remote integration test proves one persistent workspace transitions `Cloned -> Updated -> Unchanged` across source changes.

## Verification

- JavaScript core: 212/212 PASS.
- Rust: 118 unit + 5 collector + 2 lifecycle + 1 repository-workspace + 2 technology-evolution = 128/128 PASS.
- `cargo fmt --all -- --check`: PASS.
- strict Clippy: PASS.
- `git diff --check`: PASS.
- Combined verification terminal `term_1790265571409_67` exited 0.

## Next exact step

Connect the managed repository workspace to the existing Rust collectors through a small application/service boundary, then scaffold the minimal Tauri desktop shell that can select/refresh/analyze repositories. Do not mark F8 closed until that end-to-end local flow exists.

No commit or push was performed.
