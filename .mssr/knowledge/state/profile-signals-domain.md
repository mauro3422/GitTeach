# Profile signals and repository domains

## Verified contracts

- `giteach-development-tendencies-v1` now includes deterministic repeated `observability` and `benchmarking` signals in addition to testing/verification, automation, documentation, tooling/configuration and CI/delivery.
- The Rust collector preserves bounded `profile-signal` evidence independently from generic source sampling, so paths such as `benches/**`, `benchmarks/**`, `telemetry/**`, `metrics/**` and observability configuration do not silently disappear when the source-evidence budget is small.
- `giteach-repository-domain-fingerprint-v1` is shared in JS/Rust. It emits zero or more explainable domain candidates from deterministic technologies/languages plus optional GitHub Topics.
- Domain candidates are multi-label and rule-based. They have no confidence, expertise, seniority or winner score.
- GitHub Topics are repository-declared metadata. Topic refs use `github-topic:<repository>:<topic>` and remain distinct from file evidence.
- A language alone is not enough to fabricate a broad domain such as developer tooling. An empty deterministic fingerprint is valid and means semantic/declarative evidence may still be needed.
- Per-candidate provenance is bounded to at most 6 repository evidence refs plus 2 topic refs.

## Real canaries

- `D:\Dev\kode`: deterministic candidates `desktop-application`, `developer-tooling`, `web-application` from Tauri, Monaco and Svelte/SvelteKit signals.
- `D:\Dev\incremental-farm`: deterministic `game-development` from Godot + GDScript. Post-hardening canary retained exactly 6 evidence refs rather than the earlier 24.
- `D:\Dev\GitTeach`: no local deterministic domain candidate from technology/language signals. This is an expected abstention boundary, not an error.

## Verification

- JavaScript: 123/123 PASS.
- Rust: 58 unit + 5 collector integration + 2 lifecycle integration = 65/65 PASS.
- Strict Clippy, `cargo fmt --all -- --check`, and `git diff --check`: PASS.

## Next boundary

Use these deterministic candidates/facts before Jev. Persistent selective Jev reuse is now closed in `.mssr/knowledge/decision/incremental-profile-contracts.md`; the next product boundary is F6 declarations/interviewer, especially for cases where deterministic domain fingerprinting legitimately abstains.
