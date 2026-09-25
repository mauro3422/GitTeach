# Session — F5 connected GitHub facts

**Date:** 2026-09-23  
**Branch:** `rebuild/evidence-profile-core`  
**MSSR trace:** `mssr-20260923204448-30620843-b9d`

## Scope

Add provider-neutral GitHub evidence for Releases, pull requests, reviews and issues, preserve exact provenance in EvidenceLedger, and convert only unambiguous attributable GitHub actions into ActorEvidence. Keep local Git tags separate from GitHub Releases and avoid evaluative scoring.

## GitHubRepositoryFacts v1

- Added shared JS/Rust `giteach-github-repository-facts-v1`.
- Fact kinds: `release`, `pull-request`, `review`, `issue`.
- Stable fact identity: `github:<owner/repo>:<kind>:<source-id>`.
- Bundle stores repository identity, connected login, observation time, raw bounded facts, deterministic summary and connected-actor activity counts.
- Counts are descriptive only; no expertise, quality or seniority output exists.

## REST boundary

- JS `GitHubRestFactsAdapter` translates current GitHub REST payloads into the provider-neutral contract.
- GitHub Issues endpoints may return pull requests; records carrying `pull_request` are excluded from issue facts to prevent double-counting.
- Review pull numbers may be taken from an explicit wrapper or derived from `pull_request_url`.
- Release facts are created only from the Releases surface; local Git tags never become Releases implicitly.
- `scripts/github-public-canary.mjs` provides a bounded public-resource smoke path without private credentials. Requests are serialized; rate-limit headers are surfaced, and optional review/issue probes degrade instead of crashing when GitHub throttles unauthenticated traffic.

## EvidenceLedger + attribution

- Added `GitHubFactsAdapter` so every GitHub fact becomes an exact resolvable EvidenceLedger record.
- Connected-login authored PR -> `authored-change` with implementation origin `unknown`: identity-linked contribution only.
- Submitted non-PENDING review -> `reviewed-change`: observable review agency.
- Pending reviews are not agency because they have not been submitted.
- Releases/issues remain GitHub activity facts and do not fabricate design/review/debug/maintenance agency.
- JS and Rust follow the same actor-conversion rules.

## Public canary

- Public API query for `mauro3422` returned 30 public repositories at observation time.
- Public GitHub search returned 5 authored public PRs.
- Real target `AllTheMods/All-the-mods-10-Sky#821` passed through the product adapter:
  - pullRequestCount 1;
  - mergedPullRequestCount 1;
  - reviewCount 0;
  - issueCount 0 after filtering the PR-shaped Issues representation;
  - one stable GitHub fact ref;
  - one EvidenceLedger record;
  - one `authored-change` ActorEvidence for `mauro3422`;
  - implementation origin remained `unknown`.

## Verification

- JavaScript: 80/80 PASS.
- Rust: 44 unit + 4 collector integration + 2 lifecycle integration = 50/50 PASS.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS; only Windows LF→CRLF notices.
- Initial public REST canary: PASS. Repeating it after additional unauthenticated API traffic hit HTTP 403/rate limiting; the canary was hardened to report transport degradation/rate headers rather than crash. This does not invalidate the earlier successful domain-path canary.

## Documentation/context

- Added selective `.mssr/knowledge/state/github-connected-facts.md` and registered it in `.mssr/project-context.json`.
- Reconciled PROJECT_CONTEXT, PROJECT_STATE, PROJECT_MEMORY, current phase, HANDOFF, README, ROADMAP, ARCHITECTURE, AI-era profile model and experience-attribution docs.
- No global skill change is implied; these rules are GitTeach project architecture.

## Next

Add bounded GitHub connection/transport for authenticated/private repos with pagination, caching and least-privilege privacy rules, then aggregate collaboration facts across independent repositories.

No commit or push was requested.
