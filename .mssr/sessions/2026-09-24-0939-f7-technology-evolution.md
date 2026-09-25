# Session — F7 historical technology evolution

**Date:** 2026-09-24 09:39 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** historical technology-evolution slice implemented and verified; F7 remains active

## Reconciliation

The session resumed after concurrent work had already advanced F6 declarations/interview/publication and the first F7 WidgetForge statistics/technology-footprint slice. The tree authority was revalidated before mutation; no older F5/F6 state was restored over newer work.

## Objective

Add bounded historical technology evolution for WidgetForge using real Git history without checking out old commits or fabricating intermediate history.

## Implemented

- Added shared schema `giteach-technology-evolution-v1`.
- Added JS validator/normalizer `presentation/TechnologyEvolution.js`.
- Added Rust `technology_evolution` collector and shared exports.
- Historical commit metadata comes from real Git history; each selected commit is inspected with Git tree/blob metadata.
- Source-language classification reuses the current collector language mapping.
- Sampling strategy `evenly-spaced-commits-v1` includes all commits when history fits the budget; otherwise it keeps real first/latest commits and deterministic real intermediate commits.
- Contract exposes `commitCount`, `snapshotCount`, `maxSnapshots` and `completeHistory` so WidgetForge can display coverage honestly.
- Added a small Rust example for local canary/debug output.

## Safety / semantics

- No checkout is performed.
- Integration tests prove branch, HEAD and working-tree status do not change.
- No interpolation/synthetic points are generated between commits.
- Timeline values are repository composition at selected commits, never skill/expertise/seniority progression.
- Current uncommitted work is not backfilled into historical Git.

## Real canaries

### GitTeach

One committed historical snapshot is visible. It contains 423 recognized source files: JavaScript 385, CSS 25, Python 7 and HTML 6. The large current rebuild remains uncommitted and therefore correctly does not appear as historical Git evolution.

### Kode

47 commits were observed and 8 real snapshots selected (`completeHistory = false`). The first sampled commit has 8 recognized source files (Rust 3, JavaScript 2, HTML/Svelte/TypeScript 1 each). The latest sampled commit has 100 recognized source files (Rust 34, TypeScript 27, Svelte 23, JavaScript 11, CSS 3, PowerShell 1, HTML 1).

## Verification

- JavaScript: 189/189 PASS.
- Rust: 103 unit + 5 repo-evidence integration + 2 lifecycle integration + 2 technology-evolution integration = 112/112 PASS.
- `cargo fmt --check`: PASS.
- strict Clippy: PASS.
- `git diff --check`: PASS.

## Next

Compose `ProfileStatistics v1`, per-repository `TechnologyEvolution v1` and explicitly approved `ProfilePublicationContext v1` into a stable WidgetForge-facing payload without mutating the semantics of any upstream contract. Then start concrete README/portfolio widget composition.

No commit or push was performed.