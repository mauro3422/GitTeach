# Session — F5 deterministic lifecycle metrics

**Date:** 2026-09-23  
**Branch:** `rebuild/evidence-profile-core`  
**MSSR trace:** `mssr-20260923201301-cc487ed4-bdd`

## Scope

Extend the AI-era profile with deterministic delivery/maintenance facts that do not equate commit activity with expertise. Keep local Git tags separate from GitHub Releases and provide a portfolio-level summary suitable for later WidgetForge/LLM consumption.

## RepositoryLifecycle v1

- Added shared JS/Rust `giteach-repository-lifecycle-v1`.
- Fields include commit count, first/latest commit, active calendar months/years, reachable local Git tags, first/latest reachable tag, commits after latest reachable tag and a boolean post-tag-work fact.
- Rust `collect_repository_lifecycle()` collects real local Git data.
- Tag discovery uses only tags reachable from current `HEAD`; a side-branch-only tag is ignored.
- Unit and integration tests create real temporary Git repositories and verify dated commits, tags, post-tag commits and unreachable-tag isolation.
- Local Git tags are explicitly not promoted to GitHub Releases.

## PortfolioLifecycle v1

- Added shared JS/Rust `giteach-portfolio-lifecycle-v1`.
- Aggregates analyzed repositories, repositories with history, multi-month history, reachable tags, post-tag work and total reachable tag count.
- Duplicate lifecycle snapshots for the same repository count once.
- No expertise, seniority or quality score is emitted.

## Real local canary

- GitTeach: 1 commit, first/latest `2026-01-31T23:09:41-03:00`, 1 active month/year, 0 reachable tags.
- The current GitTeach rebuild is largely uncommitted, so this intentionally demonstrates that Git history is factual but incomplete evidence of current work.
- Kode: 47 commits, first `2026-09-12T05:04:12-03:00`, latest `2026-09-19T03:38:20-03:00`, 1 active month/year, 1 reachable tag `v0.1.0-p4`, 14 commits after that tag.
- These are repository-history facts only and do not prove personal authorship, quality or long-term maintenance by themselves.

## Context maintenance

- Added selective state module `.mssr/knowledge/state/lifecycle-metrics.md` and registered it in `.mssr/project-context.json`.
- Compacted `PROJECT_STATE.md` and `project-current-phase.md` instead of growing already pressured modules.
- Updated stale project memory wording that still described the deleted legacy runtime as frozen active reference material.

## Verification

- JavaScript: 70/70 PASS.
- Rust: 38 unit + 4 collector integration + 2 lifecycle integration = 44/44 PASS.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only Windows LF→CRLF notices.

## Next

Add connected GitHub facts that cannot be inferred from local Git: GitHub Releases and PR/review/issue collaboration activity. Then continue deterministic observability, experimentation/benchmarking and project/domain signals before returning to incremental Jev persistence and the conversational profile interviewer.

No commit or push was requested.
