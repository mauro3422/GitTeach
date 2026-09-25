# Project Context

## Project identity

- Repository: `GitTeach`
- Canonical path: `D:\Dev\GitTeach`
- Canonical development branch: `main`; the pre-rebuild Electron baseline is preserved at `archive/legacy-electron-v2.89` and tag `legacy-electron-v2.89-final`.
- Product purpose: build a personalized, evidence-backed professional developer profile from repositories/GitHub, cross-project tendencies and optional user-authorized profile sources, while remaining useful when AI writes much of the implementation.
- Primary user-facing outputs: GitHub profile README, portfolio, LinkedIn/CV evidence bundles, project summaries and WidgetForge-compatible profile visualizations.

## Architecture

- New source of truth: `src/core/`.
- Durable core direction: Rust-first/library-first for the long-lived collector/profile engine; JavaScript remains a shared-contract/application surface during the rebuild.
- Product runtime direction: desktop-first/local-first Tauri 2 over the Rust core. The verified F9 baseline webview is vanilla HTML/CSS/JS; the next UI modernization may move interaction/presentation to Svelte 5 + Vite without moving repository/profile truth, persistence, or publication authority out of Rust/core contracts.
- Repository acquisition: local repos are analyzed in place; remote repos keep blobless commit/tree/path/blob audit identity and hydrate only bounded selected blobs transiently. Clone-once worktrees remain reference/fallback.
- Persistence: SQLite v4. F9.1 audit identity; F9.2a repo snapshots; F9.2b personal snapshots; F9.3a exact-profile private answers. Publication stays hard-disabled through extended tests; consent is not persisted. Details: `.mssr/knowledge/state/local-product-persistence.md`.
- Repository/GitHub/filesystem facts and statistics are deterministic inputs and do not require Jev.
- Connected GitHub Releases/PRs/reviews/issues remain deterministic source facts. Authored PRs may establish identity linkage and submitted reviews may establish review agency, but release/issue activity alone does not fabricate personal engineering agency.
- Cross-project tendencies are derived from repeated observable support; Jev may judge ambiguous patterns but never replaces deterministic measurements.
- Personal profile context may also come from explicit user declarations or optional authorized profile sources; self-report stays distinguishable from observed evidence.
- Desktop F6 answers stay private; only explicitly approved declaration ids enter `ProfilePublicationContext v1`. The webview receives approved context plus sanitized `DocumentInput`, never raw evidence/path/hash/internal authorization metadata.
- Presentation is a bounded downstream pipeline: deterministic statistics/history plus explicitly approved publication context -> `ProfilePresentation` -> WidgetPlan -> widget-specific WidgetData -> README/portfolio SurfaceComposition. WidgetForge rendering (HTML/SVG/theme) stays outside the GitTeach core, and project/LinkedIn/CV prose continues through the separate `DocumentInput` writing boundary.
- AI-assisted/mixed implementation origin is provenance to preserve, not a negative score; GitTeach must not estimate a fake `percent human code`.
- The shipped product is standalone and must not require Bridge, MSSR, OmnySys or coding-agent telemetry. External receipts remain optional enrichment only.

## Product invariant

Every published profile statement must expose its evidence class: deterministic connected-account/repository fact, repeated cross-project tendency, bounded semantic interpretation, self-reported declaration, or stronger attributable actor evidence. GitTeach may describe patterns across a user's connected projects without claiming manual authorship; action verbs such as `designed`, `reviewed` or `debugged` still require corresponding actor evidence.
