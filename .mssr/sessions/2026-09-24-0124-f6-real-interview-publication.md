# Session — F6 real interview + publication firewall

**Date:** 2026-09-24 01:24 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** F6 closed and verified; F7 active

## Objective

Finish the provider-neutral profile-interview path with real GitTeach outputs and prove that private self-report cannot leak into publication surfaces without explicit approval.

## Implemented / verified

- Preserved concurrent `ProfileObservationAdapter` JS/Rust work instead of duplicating it.
- Real rescans of `D:\Dev\GitTeach` and `D:\Dev\kode` fed `DevelopmentTendencies -> profile observations -> reconciliation -> interview plan -> user-facing prompts`.
- Canary result: automation and documentation were each observed in 2/2 repositories, producing `confirm-observed-pattern` questions with exact evidence refs.
- Sample automation answer became `ProfileDeclaration v1`, `sourceKind=user-answer`, `publicationStatus=private` by default.
- Added shared JS/Rust `giteach-profile-publication-context-v1`.
- Publication context revalidates declarations, isolates the subject actor, includes only explicit `approved` declarations, and omits internal authorization/source hashes/source refs/publication metadata.
- Added an end-to-end deterministic test proving `tendency -> interview -> private declaration -> explicit approval -> bounded publication context`.
- Concrete external profile/network providers are intentionally outside F6 and remain optional adapters.

## Verification

- JavaScript: 173/173 PASS.
- Rust: 91 unit + 5 collector integration + 2 lifecycle integration = 98/98 PASS.
- `cargo fmt --all -- --check`: PASS.
- strict `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS (Windows LF→CRLF warnings only).

## Next

F7: define stable WidgetForge-facing statistics/presentation contracts from existing deterministic/tendency/domain/lifecycle/collaboration outputs and explicitly approved declarations. Visual values must represent counts/prevalence/time/categories, never skill level or seniority.

No commit or push was performed.
