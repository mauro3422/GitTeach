# Profile statistics / WidgetForge contract

## Verified F7 boundary

- Shared JS/Rust `giteach-profile-statistics-v1` is the stable statistics contract; every section keeps its own coverage/unit and no expertise/seniority score.
- Shared `giteach-profile-presentation-v1` composes three planes without merging meaning: deterministic statistics, per-repository `TechnologyEvolution v1`, and F6 approved `ProfilePublicationContext v1`.
- Shared `giteach-profile-widget-plan-v1` decides which semantic widgets exist. Empty/missing planes produce no fabricated widget; targeted collaboration requires explicit coverage.
- Shared `giteach-profile-widget-data-v1` resolves each planned widget to only its referenced plane/section/repository. WidgetForge does not receive the full presentation payload implicitly.
- Shared `giteach-profile-surface-composition-v1` orders widget ids into semantic sections for `github-profile-readme` and `portfolio` without copying widget data.
- Widget descriptors/data/composition are provider-neutral: no HTML, SVG, theme, skill score or hidden profile-state semantics belong in these contracts.
- F4 document renderers remain the prose path for project/LinkedIn/CV surfaces; F7 does not duplicate them.

## Technology/history semantics

- `TechnologyFootprint v1` keeps repository prevalence separate from observed file/byte volume.
- `TechnologyEvolution v1` contains only real Git commit-tree snapshots; no checkout, interpolation or skill-progression claim.
- GitTeach+Kode presentation canary materializes technology, tendency and domain widgets only because no history/collaboration/publication artifacts were supplied to that run.
- WidgetData exposes only each widget's referenced source keys; SurfaceComposition stores widget ids, not copied raw data.
- GitHub README orders Technology before Development patterns; Portfolio orders Development patterns before Technology.

## Verification

- JS 212/212 PASS.
- Rust 117 unit + 5 collector + 2 lifecycle + 2 technology-evolution integration = 126/126 PASS.
- fmt-check, strict Clippy and `git diff --check`: PASS.
- Recovery re-verification on 2026-09-24 reproduced the full gate with exit code 0.

## Next

F7 is closed and remains the stable presentation boundary. F8 is now the local-first desktop product vertical slice; external profile adapters are deferred to F11 and concrete WidgetForge HTML/SVG/theme rendering to F12. None of those later phases may redefine profile truth or bypass the bounded WidgetData handoff.
