# Incremental profile contracts

## IncrementalProfilePlan v1

- Shared JS/Rust `giteach-incremental-profile-plan-v1` reuses a prior capability while all supporting evidence identities still exist. Changed/missing evidence invalidates only dependent capabilities; unrelated new evidence requests discovery without invalidating them.

## Incremental Jev / F5 close

- Shared JS/Rust `giteach-jev-observation-v1`: one repository candidate, bounded provider/model/result metadata and exact evidence identity hashes/digests; raw evidence excerpts/prompts are not persisted.
- Jev receives one candidate + only its selected evidence. `giteach-incremental-jev-plan-v1` emits `reuse`, `refresh` or `skip-no-evidence`.
- Reuse fingerprints contract, candidate/refs, exact model-visible evidence text identity, question, semantic context and provider policy. TypeSafe policy includes decision contract, requested model and acceptance threshold.
- Floating aliases use bounded `maxObservationAgeMs`; exact identity never authorizes indefinite reuse. Zero-evidence candidates skip provider work.
- Changed historical observations append instead of overwrite so evolution/conflict stays auditable.

## Persistence + canary

- Shared `giteach-jev-observation-store-v1`; JSON is a CLI/dev adapter, replaceable later by SQLite/IndexedDB without changing truth contracts.
- Cross-process Kode proof: seed=2 calls (Rust+Monaco), credential-free exact reuse=0, Rust-only evidence-content change=1 while Monaco reuses; Kubernetes remains skipped.
- Live bounded first pass: Rust 0.98, Monaco 0.97; 4,707 input / 44 output tokens. Probabilities are project-support judgments, never skill levels.
- Final F5 gate: JS 138/138; Rust 73/73; fmt, strict Clippy and diff-check PASS.
