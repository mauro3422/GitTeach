# Actor evidence sources

## Source kinds

- `git`: configured identity linkage only.
- `github`: attributable PR/review/approval/discussion evidence.
- `design-artifact`: attributable ADR/design decisions.
- `work-session` / `agent-workflow`: optional bounded agency receipts.
- `manual`: explicit user declaration, visibly self-reported.

## Verified Git producer

Rust `collect_git_actor_evidence()` matches explicit configured names/emails only. It may emit `authored-change` or explicit `coauthored-change`, intersects changed paths with exact evidence IDs in the current `RepoEvidenceBundle`, and emits nothing when no evidence-backed path survives. Git origin remains `unknown`, so this proves `identity-linked` contribution only—not manual implementation, architecture ownership or engineering judgment.

## Verified profile join

Explicit actor mode requires a subject `actorKey`; target evidence refs must resolve. Records are filtered by subject actor, repository and capability/evidence attachment, so another actor cannot elevate the subject profile. Legacy evidence-metadata attribution remains compatibility-only when explicit actor mode is absent.

## Verified GitHub source

`giteach-github-repository-facts-v1` keeps Releases, pull requests, reviews and issues as deterministic connected-source facts with stable EvidenceLedger refs. `githubFactsToActorEvidence()` / `github_facts_to_actor_evidence()` convert only bounded attributable actions: an authored PR becomes `authored-change` (identity-linked only), while a submitted non-PENDING review becomes `reviewed-change` (observable review agency). Releases/issues stay activity facts and do not fabricate engineering agency. GitHub implementation origin remains `unknown` unless another source proves otherwise.

## Remaining stronger sources

1. Attributable design/ADR records.
2. User interview/manual declarations for role, intent and AI-workflow context.
3. External agent/workflow receipts when explicitly connected; never a normal product prerequisite.

Quality/privacy/isolation rules live in `actor-evidence-quality.md`.
