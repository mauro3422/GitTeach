# Session — F5 deterministic tendencies + legacy cleanup

**Date:** 2026-09-23  
**Branch:** `rebuild/evidence-profile-core`  
**MSSR trace:** `mssr-20260923192929-0d81ae87-6d1`

## Scope

Close the safe removal of obsolete GitTeach Electron/Designer runtime surfaces and implement the first deterministic cross-project development-tendency contract without introducing expertise/seniority scoring.

## Legacy cleanup

- Audited `src/core/` and confirmed it had no imports into `src/main/**` or `src/renderer/**`.
- Classified legacy concepts as migrated, reference-only or deleted in `docs/MIGRATION_FROM_LEGACY.md`.
- Removed the obsolete Electron main/renderer runtime, Designer helpers/launchers and stale active Designer documentation.
- Preserved history in `docs/archive/`, `docs/legacy/` and Git history.
- Replaced `docs/INDEX.md` with current documentation navigation.
- Simplified `package.json` to the Node built-in test runner and removed unused npm runtime/dev dependencies; package-lock now contains only the project package.
- Active-tree search excluding archive/legacy material found no remaining references to the old runtime/Electron/Designer phase language.

## DevelopmentTendencies v1

- Added shared JS/Rust `giteach-development-tendencies-v1` with a shared schema fixture.
- Initial deterministic families: testing/verification, automation, documentation, tooling/configuration and CI/delivery.
- Minimum support is two independent repositories.
- Repository presence is the unit of prevalence; file count cannot increase a repository's weight.
- Duplicate bundles for the same repository are merged rather than double-counted.
- Each supporting repository contributes one representative evidence ref per tendency; all matches may still contribute evidence-kind classification.
- Tendencies are descriptive prevalence only; no expertise score or seniority is emitted.

## Real stored-snapshot canary

Using the existing stored `gitteach-scan.json` + `kode-scan.json` bundles:

- automation: 2/2 repositories, prevalence 1.0, 2 evidence refs;
- documentation: 2/2 repositories, prevalence 1.0, 2 evidence refs;
- tooling/configuration: 2/2 repositories, prevalence 1.0, 2 evidence refs.

These bundles are stored snapshots and were not freshly recollected after the legacy deletion, so this proves contract execution over real prior repository evidence, not a post-cleanup inventory.

## Verification

- JavaScript: 60/60 PASS.
- Rust: 30 unit + 4 integration = 34/34 PASS.
- `cargo fmt --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only existing Windows LF→CRLF notices were emitted.

## Next

Expand deterministic profile metrics for releases, maintenance cadence, PR/review/issues, observability, experimentation/benchmarks and project/domain fingerprints. Then persist Jev observations by candidate + exact evidence identity so only invalidated/new ambiguous slices are re-evaluated.

No commit or push was requested.
