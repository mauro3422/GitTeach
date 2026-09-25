# F7 historical technology evolution

## Verified contract

- Shared JS/Rust schema: `giteach-technology-evolution-v1`.
- Source is local Git history only: `source = git-local-tree`.
- Rust collector reads commit metadata from `git log --reverse` and historical tree/blob metadata from `git ls-tree -r -l -z --full-tree <commit>`.
- The collector does not checkout commits and integration tests prove branch, HEAD and working-tree status remain unchanged.
- Language composition is measured from recognized historical blob paths and blob byte sizes. It describes repository composition at sampled commits, not developer skill.
- If history fits the configured budget, every commit is represented. Otherwise deterministic `evenly-spaced-commits-v1` sampling preserves first/latest commits and real intermediate commits; no synthetic/interpolated points are emitted.
- Sampling coverage is explicit through `commitCount`, `snapshotCount`, `maxSnapshots` and `completeHistory`.

## Real canaries

### GitTeach

- 1 committed historical snapshot is visible.
- Historical snapshot composition: 423 recognized source files (JavaScript 385, CSS 25, Python 7, HTML 6).
- The current large rebuild is uncommitted, so it is intentionally absent from historical Git evolution.

### Kode

- 47 commits observed; 8 real commit snapshots selected with `completeHistory = false`.
- First sampled commit: 8 recognized source files; Rust 3, JavaScript 2, HTML 1, Svelte 1, TypeScript 1.
- Latest sampled commit: 100 recognized source files; Rust 34, TypeScript 27, Svelte 23, JavaScript 11, CSS 3, PowerShell 1, HTML 1.
- These values are commit-tree composition, not quality/expertise/seniority progression.

## Verification

- JavaScript: 189/189 PASS.
- Rust: 103 unit + 5 repo-evidence integration + 2 lifecycle integration + 2 technology-evolution integration = 112/112 PASS.
- `cargo fmt --check`, strict Clippy and `git diff --check`: PASS.

## Next

Expose historical evolution through a stable WidgetForge-facing composition contract without changing the meaning of `ProfileStatistics v1`. Keep approved declaration/publication context separate from deterministic statistics/history.