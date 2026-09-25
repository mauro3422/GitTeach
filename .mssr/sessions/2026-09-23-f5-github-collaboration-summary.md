# F5 GitHub cross-repository collaboration summary

Date: 2026-09-23
Branch: `rebuild/evidence-profile-core`
Trace: `mssr-20260923214601-0943573c-b8c`

## Goal

Aggregate already-collected connected GitHub activity across independent repositories without adding network calls and without converting activity volume into expertise, seniority or quality.

## Implemented

- Shared contract: `giteach-github-collaboration-summary-v1`.
- JavaScript: `src/core/github/GitHubCollaborationSummary.js`.
- Rust: `crates/giteach-core/src/github_collaboration.rs`.
- Shared schema fixture: `tests/fixtures/github-collaboration-summary-v1-schema.json`.
- Requires one connected GitHub login across all observations; mixed identities fail closed.
- Deduplicates repositories so repeated snapshots cannot inflate counts.
- Metrics keep separate:
  - exact observed activity count within collected facts;
  - number of independent supporting repositories;
  - supporting repository names;
  - bounded stable GitHub fact refs;
  - count of omitted refs when provenance display is bounded.
- Covered metrics: authored Releases, authored PRs, merged authored PRs, submitted reviews and authored issues.
- Collection coverage is retained separately:
  - complete/partial base repository count;
  - targeted review repository count;
  - requested/queried/omitted PR counts;
  - completeness only for the requested PR set;
  - `reviewHistoryComplete` always false because targeted review queries do not prove whole-account history.
- The summary performs no network calls.

## Review submission correction

GitHub documentation states that a review created as `PENDING` is not submitted and does not include `submitted_at`. The base `GitHubRepositoryFacts.connectedActorActivity.submittedReviewCount` was corrected in both JS and Rust to require a non-PENDING review with an actual submission timestamp. This now matches `GitHubActorEvidence` and the collaboration summary. Raw `reviewCount` still keeps pending review facts as observed source data.

## Verification

- JavaScript: 114/114 PASS.
- Rust: 51 unit + 4 collector integration + 2 lifecycle integration = 57/57 PASS.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only normal Windows LF->CRLF notices.
- Cross-repo tests cover deduplication, partial coverage, targeted-review semantics, pending reviews, bounded provenance, mixed-login rejection and shared JS/Rust schema shape.

## Bridge note

Two transient connector network errors occurred while applying formatting/reading docs. `bridge_health` immediately reported version `0.6.140`, live/ready tunnel and no new 502s since the active baseline. The failed calls did not create partial GitTeach side effects; work resumed from verified state.

## Next

Add deterministic observability, experimentation/benchmark and project/domain signals. Then persist Jev observations by candidate + exact evidence identity and prove selective reuse/invalidation with a two-snapshot canary.
