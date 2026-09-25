# Migration from legacy GitTeach

The old GitTeach implementation contained useful ideas, but its runtime mixed several responsibilities that the rebuild no longer needs.

## Keep conceptually

The rebuild preserves these useful concepts:

- evidence accumulation and traceability;
- per-repository synthesis before cross-repository aggregation;
- profile generation as a consumer of curated technical data;
- semantic analysis separated from final presentation;
- repository scanning and bounded context selection.

Useful legacy references include `EvidenceStore`, `RepoBlueprintSynthesizer`, `ProfessionalAggregator`, `ProfileBuilder`, and the repository-analysis pipeline.

## Replace

The following legacy behavior is not authoritative in the rebuild:

- "Developer DNA" as a single opaque truth object;
- direct seniority labels inferred from complexity/stack counts;
- profile claims that cannot point back to concrete evidence;
- triple local AI servers as a product requirement;
- embeddings/vector memory as a mandatory dependency;
- UI/designer/pipeline visualization as part of the domain core.

The old README is preserved at `docs/legacy/README-v2.89.md` for historical reference.
## Final legacy classification — 2026-09-23

The evidence/profile path has reached the point where the old Electron runtime is no longer needed. Before removal, the legacy surface was audited against `src/core/`: there are no imports from `src/core/` into `src/main/` or `src/renderer/`.

| Legacy area | Classification | Replacement / reason |
|---|---|---|
| `EvidenceStore`, repository evidence accumulation | migrated concept | `src/core/evidence/EvidenceLedger.js`, `RepoEvidenceAdapter.js`, Rust `RepoEvidenceBundle` |
| repository analysis / bounded scanning | migrated concept | Rust collector under `crates/giteach-core` |
| `RepoBlueprintSynthesizer`, `ProfessionalAggregator`, `ProfileBuilder` | migrated concept | bounded semantic provider + `ProfileAggregator` + document preparation |
| old README/design history | reference-only | `docs/legacy/` and Git history |
| old design/canvas investigation history | reference-only | `docs/archive/` only; it is not current architecture |
| `src/main/**` Electron runtime | delete | no core dependency; obsolete runtime/auth/cache/db/orchestration surface |
| `src/renderer/**` Designer/Canvas/DNA/AI UI runtime | delete | no core dependency; product direction no longer includes that runtime |
| root Designer/Electron helper scripts and launchers | delete | depend on removed runtime or have no current callers |
| old Electron/Vitest runtime configuration and legacy-only npm packages | delete | current core tests use Node's built-in test runner |
| stale active Designer docs/indexes | delete or replace | historical material belongs under `docs/archive/` / `docs/legacy/`, not current navigation |

Deletion does not erase provenance: Git history plus `archive/legacy-electron-v2.89` and tag `legacy-electron-v2.89-final` preserve the removed implementation for archaeology. No legacy service may become a hidden dependency of `src/core/`.

## Recovered local-product/cache lessons — 2026-09-24

Full Git history was restored and inspected before starting the next product phase. The user correctly remembered that GitTeach already had a local product shape: the root commit `bce98b4` was an Electron application with `src/main` services plus a renderer/dashboard.

The useful lesson is the **local application boundary**, not a reason to restore the deleted runtime:

- legacy `repoService` did **not** clone repositories; it listed repositories through GitHub REST, requested one recursive Git tree per repository, then downloaded selected files through the Contents API;
- `RepositoryCacheManager` persisted repository tree SHA plus per-file SHA/summary/snippet, so unchanged file content could be reused rather than downloaded/re-analyzed;
- later offline/cache-first work (including `e19adb0`) reused cached file snippets aggressively;
- however, the old scanner still paid for repository-tree checks and could fan out repository/file work with broad `Promise.all`; the old Electron GitHub client did not provide the rebuild's centralized pagination budgets, conditional HTTP validation or local rate-limit/backoff state;
- therefore the cache **idea** is retained, while repository acquisition changes: source/history should come from a persistent local Git workspace (clone once, fetch later), and GitHub REST should be reserved for metadata/collaboration facts;
- the rebuild's current `GitHubRestClient` already provides the safer REST transport boundary (serialized reads, ETag/Last-Modified, bounded pagination, timeout and rate-limit/backoff).

F8 starts this replacement as `giteach-repository-workspace-v1`. It does not make any deleted `src/main/**` or `src/renderer/**` implementation a dependency again.

## OmnySys boundary

Do not move OmnySys code into GitTeach. If an OmnySys adapter is added later, it consumes an export/query result and converts it to GitTeach evidence records.

This prevents duplicated ownership while still allowing existing repository intelligence to be reused when available.
