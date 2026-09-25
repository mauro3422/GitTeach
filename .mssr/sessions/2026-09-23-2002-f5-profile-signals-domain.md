# Session — F5 profile signals + repository domains

**Date:** 2026-09-23  
**Branch:** `rebuild/evidence-profile-core`  
**Trace:** `mssr-20260923220751-b04dc47a-956`

## Closed work

- Extended shared JS/Rust `giteach-development-tendencies-v1` with deterministic `observability` and `benchmarking` tendency families.
- Added bounded collector-side `profile-signal` preservation so benchmark/telemetry/observability evidence survives even when generic source sampling is heavily constrained.
- Added shared JS/Rust `giteach-repository-domain-fingerprint-v1`.
- Domain fingerprinting is multi-label and explainable; candidates are derived from technology/language evidence plus optional GitHub Topics.
- Added `GitHubRestClient.listRepositoryTopics()` using the official read-only repository Topics surface.
- GitHub Topics remain declared repository metadata, not semantic confidence.
- Language alone cannot fabricate broad domains such as developer tooling.
- Empty deterministic domain fingerprints are valid abstentions.
- Per-candidate provenance is bounded to 6 repository evidence refs plus 2 Topic refs.
- Added reusable Rust example `crates/giteach-core/examples/domain_fingerprint.rs` for real-repository canaries.

## Real canaries

- `D:\Dev\kode`: `desktop-application`, `developer-tooling`, `web-application` from Tauri/Monaco/Svelte-family evidence.
- `D:\Dev\incremental-farm`: `game-development` from Godot + GDScript. Final hardened run retained 6 evidence refs rather than the initial 24.
- `D:\Dev\GitTeach`: no deterministic local domain candidate from technology/language evidence. This is treated as a valid boundary for later Topics/declarative/Jev enrichment rather than a failure.

## Verification

- JavaScript: 123/123 PASS.
- Rust: 58 unit + 5 collector integration + 2 lifecycle integration = 65/65 PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `cargo fmt --all -- --check`: PASS.
- `git diff --check`: PASS (Windows LF→CRLF warnings only).

## Next

Persist Jev observations by candidate + exact evidence identity and rerun only invalidated/new ambiguous slices. Prove selective semantic reuse/invalidation on a real two-snapshot repository canary before moving further into conversational profile synthesis.

No commit or push was requested.
