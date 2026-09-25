# Deterministic lifecycle metrics

## Implemented contracts

- Shared JS/Rust `giteach-repository-lifecycle-v1` describes local Git history without assigning quality, expertise or seniority.
- Repository lifecycle fields: commit count, first/latest commit time, active month/year counts, reachable local Git tags, first/latest reachable tag, and commits after the latest reachable tag.
- Rust `collect_repository_lifecycle()` reads the local repository directly. Tags are restricted to those reachable from current `HEAD`; an unrelated branch tag cannot create a false post-tag-maintenance signal.
- Git tags remain distinct from GitHub Releases. A tag fact does not imply that a GitHub Release was published.
- Shared JS/Rust `giteach-portfolio-lifecycle-v1` aggregates repositories with history, multi-month history, reachable tags and post-tag work. Duplicate snapshots for one repository never increase portfolio counts.

## Interpretation boundary

- Commit volume and active-month counts are measurements, not developer-quality scores.
- `hasPostTagCommits=true` means the current history contains commits after the latest reachable local tag; it does not prove ownership, release quality or personal authorship.
- `activeMonthCount >= 2` means activity spans multiple calendar months; it does not by itself establish long-term maintenance.
- GitHub Releases, PRs, reviews and issues require their own connected-source facts and must not be inferred from local tags/commits.

## Real local canary

- GitTeach current checked-out history: 1 commit, 1 active month, 0 reachable tags. The large rebuild is still uncommitted, so Git history alone is intentionally incomplete evidence of current work.
- Kode current checked-out history: 47 commits, 1 active month, 1 reachable tag (`v0.1.0-p4`), 14 commits after that tag.
- These values are repository facts only; they are not skill or seniority signals.

## Verification

- JavaScript: 70/70 PASS.
- Rust: 38 unit + 4 collector integration + 2 lifecycle integration = 44/44 PASS.
- `cargo fmt --all -- --check`, strict clippy and `git diff --check`: PASS.
