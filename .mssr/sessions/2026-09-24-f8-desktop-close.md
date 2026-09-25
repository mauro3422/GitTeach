# F8 desktop vertical slice close

**Date:** 2026-09-24  
**Branch:** `rebuild/evidence-profile-core`  
**MSSR trace:** `mssr-20260924203628-796bb1ad-e0d`

## Closed scope

F8 is closed end-to-end as the first usable local-first GitTeach product path:

`connect/select repositories -> local in-place or remote blobless audit refresh -> transient selected hydration -> bounded repository inspection -> actor-linked personal profile -> F6 reconciliation/interview -> private declarations -> explicit per-declaration publication approval -> sanitized README/portfolio/CV/LinkedIn document drafts`

The final F8.2 slice adds the desktop `prepare_profile_interview`, `answer_profile_interview` and `generate_profile_outputs` commands and the guided webview flow. Interview prompts are bounded and provenance-resolvable. Answers are private by default. Only explicitly approved declaration IDs can enter `ProfilePublicationContext v1`.

`giteach-profile-output-bundle-v1` returns five personal `DocumentInput` projections while keeping raw evidence objects, repository/source/cache paths, source/excerpt hashes and internal authorization/source metadata outside the webview. Draft text continues through the existing F4 `DocumentDraftRenderer`; this slice does not create a second prose authority.

## Verification

- JavaScript core: **228/228 PASS**.
- Focused desktop view-model: **15/15 PASS**.
- Rust: **141/141 PASS** (`121` core + `6` collector + `1` repository-audit + `2` lifecycle + `1` repository-workspace + `2` technology-evolution + `8` desktop).
- `cargo fmt --all -- --check`: PASS.
- strict Clippy: PASS.
- Node syntax checks: PASS.
- `git diff --check`: PASS.
- QA remained headless; no visual GUI smoke is claimed.

## Durable state

`ROADMAP.md`, `.mssr/PROJECT_STATE.md`, `.mssr/HANDOFF.md`, `.mssr/knowledge/phase/project-current-phase.md`, `.mssr/knowledge/state/profile-declarations-interview.md`, `ARCHITECTURE.md` and the milestone changelog now agree that F0-F8 are closed and F9 is next.

F9 owns SQLite-backed persistence for repository connections, audit receipts, bounded analysis/evidence/profile snapshots, private declarations, publication consent, refresh metadata and semantic-cache identity. Raw remote source bodies remain transient by default. External adapters remain F11 and concrete WidgetForge rendering remains F12.

No commit or push was requested; the rebuild remains an uncommitted working line.
