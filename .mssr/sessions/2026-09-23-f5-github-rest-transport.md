# F5 GitHub REST transport + bounded collector

Date: 2026-09-23
Branch: `rebuild/evidence-profile-core`
Trace: `mssr-20260923211016-62e6b6c5-5c4`

## Goal

Add a safe read-only GitHub transport outside the domain model and a bounded collector that can feed `giteach-github-repository-facts-v1` without unbounded request fan-out or secret leakage.

## Implemented

- `src/core/providers/GitHubRestClient.js`
  - GET-only provider boundary.
  - optional lazy `getAccessToken` callback; token is never stored in profile/domain state;
  - GitHub REST API version header `2026-03-10`;
  - serial request queue;
  - same-origin URL enforcement before credentials are sent;
  - GitHub `Link` pagination with explicit page/item budgets;
  - ETag / Last-Modified conditional requests;
  - bounded request timeout;
  - sanitized token-provider, network, auth, permission and 404 errors;
  - primary/secondary/429 rate-limit interpretation with local `retryAt` backoff and no automatic retry loop;
  - public cache keys remain URL-compatible;
  - authenticated cache is disabled unless `getCachePartition` provides a stable non-secret connection partition; different partitions cannot share cached representations.
- `src/core/providers/GitHubRepositoryFactsCollector.js`
  - bounded Releases/PRs/Issues collection;
  - review requests only for explicitly selected pull numbers;
  - unique/limited targeted review set;
  - explicit base/review coverage, omitted pull count and truncation state;
  - output bridges through `GitHubRestFactsAdapter` into provider-neutral facts.
- `src/core/index.js` exports transport/collector surfaces.

## Verification added

- transport unit tests cover lazy credentials, serialization, cache/304, bounded pagination, cross-origin rejection, rate limits, permission/auth/404 behavior and API version;
- hardening tests cover local backoff, timeout, sanitized network/credential failures, 429 fallback, authenticated-cache fail-safe and per-connection isolation;
- collector tests cover base coverage, targeted reviews, no implicit N+1, truncation and invalid-input fail-fast;
- local HTTP integration exercises `HTTP -> GitHubRestClient -> GitHubRepositoryFactsCollector -> GitHubRepositoryFacts`.

## Final gate

- JavaScript: 106/106 PASS.
- Rust: 44 unit + 4 collector integration + 2 lifecycle integration = 50/50 PASS.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only normal Windows LF->CRLF notices.

## External/API evidence

GitHub current guidance used for the transport: make authenticated requests when appropriate, avoid concurrency, follow `Link` headers, use conditional requests/cache, and stop/back off on primary or secondary rate limits. A real unauthenticated canary had already produced an HTTP 403 rate-limit event, which is treated as transport degradation rather than a GitTeach domain failure.

## Next

Aggregate collaboration facts across independent repositories from already-collected `GitHubRepositoryFacts` plus explicit coverage metadata. Do not convert activity volume into quality/seniority and do not add new network fan-out for the aggregation itself.
