# GitHub connected facts

## Contract

- Shared JS/Rust `giteach-github-repository-facts-v1` keeps `release`, `pull-request`, `review` and true `issue` facts separate, with refs `github:<owner/repo>:<kind>:<source-id>`.
- REST translation filters PR-shaped Issues results. Authored PRs may establish identity linkage; only actually submitted reviews may establish review agency.
- `PENDING` reviews remain facts but do not count in `submittedReviewCount`: submitted activity requires non-PENDING state plus a submission timestamp.

## Transport and collection

- `GitHubRestClient`: read-only serial requests, bounded `Link` pagination, conditional cache, timeout, sanitized failures, same-origin enforcement and local rate-limit/backoff.
- Authenticated cache requires a stable non-secret connection partition; otherwise authenticated caching is disabled.
- `GitHubRepositoryFactsCollector` bounds Releases/PRs/issues and queries reviews only for selected PRs, retaining requested/queried/omitted/truncated coverage.

## Cross-repository summary

- Shared JS/Rust `giteach-github-collaboration-summary-v1` consumes collected facts + coverage only; no network calls.
- It deduplicates repositories, requires one connected login, and keeps `observedCount`, supporting `repositoryCount`, repositories and bounded fact refs separate.
- Review coverage is always targeted. Completeness applies only to requested PRs; whole review history is never inferred. Activity volume never becomes expertise/seniority/quality.

## Evidence and verification

- Public canary `AllTheMods/All-the-mods-10-Sky#821`: merged PR fact -> ledger ref -> identity-linked `authored-change`, origin `unknown`.
- Local HTTP integration proves `REST -> client -> collector -> GitHubRepositoryFacts`.
- GitHub docs confirm `PENDING` reviews are not submitted and lack `submitted_at`.
- JS 114/114 PASS; Rust 57/57 PASS; fmt-check, strict clippy and `git diff --check` PASS.
