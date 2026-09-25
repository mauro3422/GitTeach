# Milestone �?" Evidence-backed profile foundation

**Date:** 2026-09-23  
**Type:** milestone  
**Branch:** `rebuild/evidence-profile-core`

## Closed in this milestone

- Reframed GitTeach as an evidence-backed developer-profile engine.
- Separated GitTeach responsibility from OmnySys governance responsibilities.
- Established `src/core/` as the new architectural source of truth.
- Added `EvidenceLedger` with stable, resolvable evidence references.
- Added a `JevSemanticProvider` boundary for bounded semantic judgments.
- Added `ProfileAggregator` and `explainSkill()` for cross-repository claims with provenance.
- Added core tests proving that missing evidence references are rejected.
- Rewrote README, architecture, roadmap and migration documentation for the new direction.
- Archived the legacy README and preserved the old runtime as migration/reference material.

## Verification

- `npm run test:core`: PASS, 2/2 tests.
- `git diff --check`: PASS.
- `src/core/` has no imports into legacy `src/main` or `src/renderer` runtime.
## Unreleased �?" next slices

- F1 `RepoEvidenceCollector` and `RepoEvidenceBundle v1`.
- F2 real Jev/TypeSafe integration over bounded evidence bundles.
- Cross-repository recency/diversity/contradiction aggregation.
- Output renderers for GitHub, portfolio, LinkedIn and CV.
- Legacy module classification: migrate / reference-only / delete.

## Notes

No commit or push was requested for this milestone. The branch remains a working rebuild line.

## F1 verified �?" RepoEvidenceCollector

- Added and verified the Rust `giteach-core` collector producing `RepoEvidenceBundle v1`.
- Captures repository/Git identity, bounded source/doc/test/tooling evidence, stable IDs/hashes, language statistics and manifest-derived technology signals.
- Denies generated/vendor/sensitive paths, sanitizes credentials from HTTP Git remotes and redacts common secret assignments from excerpts.
- Verification: Rust 8/8 tests PASS, clippy with `-D warnings` PASS, JS core 2/2 PASS, `git diff --check` PASS, and a real GitTeach repository canary PASS.
- F2 remains unreleased/not started; the remaining boundary task is deterministic bundle-to-ledger provenance bridging plus authoritative TypeSafe API discovery.

## F1 closed �?" provenance bridge

- Added deterministic `RepoEvidenceBundle v1` ��' `EvidenceLedger` adapter in `src/core/evidence/RepoEvidenceAdapter.js`.
- Preserves collector evidence IDs, repository/commit identity, source/excerpt hashes, excerpts and metadata; performs no semantic inference.
- Added schema rejection and deterministic/import-to-existing-ledger coverage.
- End-to-end Rust collector ��' JSON ��' JS ledger canary: 47 evidence records imported, 47 IDs preserved.
- Verification: JS core 6/6 PASS, Rust 8/8 PASS, clippy `-D warnings` PASS and `git diff --check` PASS.
- F1 is now closed at collector + provenance bridge. F2 provider wiring remains intentionally unopened until authoritative TypeSafe API guidance is available.

## F2 contract readiness closed �?" bounded Jev contract

- Added provider-neutral `giteach-jev-bounded-v1` request/response validation before live TypeSafe wiring.
- Requests carry only bounded provenance-bearing evidence; responses may explicitly abstain.
- Rejects claims with missing/out-of-bundle evidence refs and confidence outside `[0,1]`.
- Preserves provider, model, response ID, distribution and observation metadata where supplied.
- `JevSemanticProvider` now consumes the bounded contract through its injectable judge boundary.
- Verification: JS core 11/11 PASS, Rust 8/8 PASS, clippy `-D warnings` PASS, `git diff --check` PASS.
- Live TypeSafe integration remains unreleased/not started because authoritative local SDK/API guidance is still unavailable; no credentials or network calls were used.

## F2 TypeSafe transport adapter closed — live canary pending

- Located the global `typesafe-ai` skill and followed its requirement to verify the live TypeSafe API documentation before implementation.
- Corrected the semantic boundary: Jev does not generate arbitrary skill strings; GitTeach supplies explicit capability candidates and Jev judges each candidate with a Noul question.
- Added `TypeSafeJevAdapter` for the documented `POST /v1/systemone` contract using `jev-latest`, bounded state and typed questions.
- Added candidate-set enforcement to `giteach-jev-bounded-v1` and preserved provider model/request/usage metadata.
- Added success, abstention, malformed-output, HTTP-error and timeout coverage.
- Verification: JS core 18/18 PASS, Rust 8/8 PASS, clippy `-D warnings` PASS and `git diff --check` PASS.
- No live provider request was made because `TYPESAFE_API_KEY` is absent from the current process environment. F2 overall remains open until one falsifiable budget-bounded canary succeeds.

## F2 live TypeSafe canary closed

- Credential Manager target: TypeSafe:MSSR:JevLab; secret remained ephemeral and was never logged or written to repository files.
- Real provider: jev-1.13.0.
- Canary: JavaScript programming 0.91; Kubernetes cluster administration 0.02.
- Usage: 625 input tokens, 40 output tokens; observed latency 530 ms.
- F2 is closed; next milestone is F3.


## F3 closed — DeveloperProfile v1

- Completed `DeveloperProfile v1` in JavaScript and Rust with shared public-schema verification.
- Aggregation tracks independent supporting repositories, evidence-kind diversity, latest evidence observation, explicit stale evidence and provenance-bearing contradictions.
- Missing evidence refs fail closed; frequency/confidence are not converted into expertise scores or seniority labels.
- F3 close verification before F4: JS 21/21 PASS, Rust 11/11 PASS, strict clippy and `git diff --check` PASS.

## F4 in progress — safe document preparation

- Added shared `giteach-document-input-v1` preparation in JS and Rust for GitHub profile README, project README summary, portfolio card, LinkedIn project/skills and CV evidence targets.
- `DocumentInput v1` resolves supporting evidence refs and carries only curated claims plus bounded provenance summaries/cautions. Raw repository dumps, evidence excerpts, arbitrary metadata and the complete ledger stay upstream.
- Added a deterministic Markdown draft renderer that refuses non-`DocumentInput v1` payloads and cannot introduce capabilities that are absent from the prepared claims.
- Shared schema fixture verifies JS/Rust `DocumentInput v1` field parity.
- Current verification: JS core 27/27 PASS; Rust 14/14 total PASS; `cargo fmt --check`, strict clippy and `git diff --check` PASS.

## Real repository audit / bounded Jev experiment

- GitTeach collector run: 239 files / 1,497,810 bytes scanned; 49 evidence records (24 source, 16 documentation, 5 test, 3 manifest, 1 tooling).
- Kode collector run: 249 files / 31,177,999 bytes scanned; 46 evidence records (24 source, 16 documentation, 4 tooling, 2 manifest).
- Kode live bounded Jev canary over 24 selected evidence records (`jev-1.13.0`): TypeScript 0.97, Rust 0.76, Tauri 0.97, Svelte 0.96, Monaco Editor 0.96, Kubernetes negative control 0.01.
- The canary used 16,261 input / 112 output tokens at 616 ms. This is valid evidence but too broad for routine per-candidate analysis; the next optimization is deterministic candidate-specific evidence selection before Jev.
- Repository counts, language counts and model probabilities remain evidence/observations, not expertise or seniority scores.


## F4 closed — evidence-backed document preparation

- Closed `giteach-document-input-v1` as the only normal boundary between `DeveloperProfile v1` and professional writing/rendering.
- Verified all six supported target values through the same fail-closed boundary: GitHub profile README, project README summary, portfolio card, LinkedIn project, LinkedIn skills and CV evidence.
- Deterministic rendering cannot introduce a capability absent from the curated document input and cannot access raw repository dumps or arbitrary evidence metadata.
- Added candidate-specific evidence selection before Jev and narrowed accepted claims to their candidate-specific provenance instead of attaching the whole bounded bundle.
- Fixed global evidence-budget consistency: candidate refs are intersected with the final selected bundle and invalid/out-of-bundle refs are rejected.
- Explicit zero-ref candidates cannot become accepted claims even if a provider returns a high probability.

## Collector hardening / real repository audit

- Source-evidence sampling now preserves observed language diversity inside the existing source-evidence budget instead of taking only the first files encountered.
- Added `.svelte` as first-class Svelte source/language evidence.
- Updated Kode observation: 249 files / 31,177,999 bytes; 46 evidence records; 102 source files; languages include Rust 33, TypeScript 29 and Svelte 25.
- Final Kode bounded Jev canary over 12 selected evidence records with three refs per accepted claim: TypeScript 0.79, Rust 0.85, Tauri 0.94, Svelte 0.97, Monaco Editor 0.97; Kubernetes remained unaccepted as the negative control. Usage: 9,106 input / 112 output tokens, 747 ms.
- Updated GitTeach observation: 253 files / 1,662,309 bytes; 51 evidence records; 177 source files. Bounded Jev accepted JavaScript 0.87, evidence provenance system design 0.85 and TypeSafe/Jev integration 0.91. Rust and Electron were not published by that bounded query.
- These measurements remain evidence/observations only; they do not become expertise or seniority scores.

## F5 started — incremental profile updates

- Added shared `giteach-incremental-profile-plan-v1` in JavaScript and Rust.
- Reuses prior capabilities when every supporting evidence identity still resolves.
- Invalidates only capabilities whose supporting evidence disappeared/changed.
- Unrelated new evidence requests discovery without invalidating still-supported claims.
- Added shared schema fixture and parity tests.

## Current verification

- JS core: 40/40 PASS.
- Rust: 18/18 total PASS (14 unit + 4 integration).
- `cargo fmt --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- JSON schema fixtures: PASS.
- `git diff --check`: PASS (existing LF→CRLF warnings only).
- No commit or push was requested.


## F5 attribution / AI-era experience boundary

- Split repository facts, project semantics and personal experience into separate authority layers.
- Deterministic language/manifest/Git facts remain collector-owned; normal operation should not spend Jev calls rediscovering them.
- `JevSemanticProvider` is now explicitly project-scoped through `inferProjectSemantics()` and cannot establish developer authorship, expertise or seniority.
- Added attribution states `repository-only`, `identity-linked`, `user-confirmed` and `agency-supported` in JavaScript and Rust.
- Git authored/coauthored changes are deliberately only identity-linked; they never prove manual implementation authorship.
- Added explicit implementation-origin provenance: `human`, `ai-assisted`, `mixed`, `unknown`.
- Personal document targets fail closed on `repository-only` claims; project summaries may keep them with project-scoped wording.
- Renderers now distinguish contribution, direction, design/decision, review, debugging, testing/validation and maintenance instead of generic `knows X` phrasing.
- Added shared `giteach-actor-evidence-v1` JS/Rust contract for future Git/GitHub/design/work-session/agent-workflow/manual evidence sources.
- Actor evidence must attach to explicit capability keys and/or target evidence refs; raw prompts/transcripts are outside the contract.
- Added `docs/EXPERIENCE_ATTRIBUTION.md` documenting the AI-era evidence model and concrete quality signals.
- This subsection records the contract boundary before the first real producer/profile join; the follow-up milestone below supersedes that implementation limitation.
- Verification at this contract stage: JS core 52/52 PASS; Rust 23/23 PASS (19 unit + 4 integration); `cargo fmt --check`, strict clippy, JSON fixture validation and `git diff --check` PASS.
- No commit or push was requested.

## F5 Git identity ActorEvidence producer + profile join

- Added Rust `collect_git_actor_evidence()` as the first real `ActorEvidence v1` producer.
- Git actor identities must be explicitly configured by actor key plus accepted names/emails; repository ownership is never treated as identity evidence.
- Only authored commits and explicit `Co-authored-by:` trailers can generate Git actor records.
- Each matching commit is intersected with exact normalized changed paths preserved in the current bounded `RepoEvidenceBundle`; a matching commit with zero surviving evidence paths produces no ActorEvidence.
- Git-derived ActorEvidence keeps `implementationOrigin = unknown` and therefore establishes only `identity-linked` contribution. It never proves manual implementation, design ownership or engineering judgment.
- Added explicit ActorEvidence aggregation in JavaScript and Rust. It requires a subject actor key, fails closed on unknown target evidence refs, filters by supporting repository and exact capability/evidence attachment, and prevents another actor's receipts from elevating the subject profile.
- Kept the older evidence-metadata attribution path as compatibility only when explicit ActorEvidence mode is not supplied.
- End-to-end Rust coverage proves `Git commit → ActorEvidence → DeveloperProfile` remains `identity-linked` with origin `unknown`.
- Verification: JS core 54/54 PASS; Rust 24 unit + 4 integration = 28/28 PASS; `cargo fmt --check`, strict clippy and `git diff --check` PASS.
- No commit or push was requested.

## Product reframe — AI-era developer profile + WidgetForge direction

- Reframed GitTeach around the developer rather than manual line authorship: the core question is what a person repeatedly builds, maintains, verifies, automates, reviews, ships and cares about across projects.
- Declared the shipped product as a standalone GitHub/Git-connected app/web. Bridge, MSSR, OmnySys and coding-agent telemetry are optional external evidence only, never runtime prerequisites.
- Added `docs/AI_ERA_PROFILE_MODEL.md` with deterministic metric families, cross-project development tendencies, supervisory-engineering proxies, Jev questions, conversational-LLM responsibilities, optional LinkedIn-like declarations and WidgetForge output families.
- Clarified that GitTeach can still build a useful AI-era profile without agent logs by measuring tests/regressions, automation, CI, docs/changelogs, releases/maintenance, migrations, PR/review/issue activity, recurring project domains and long-running work.
- Jev is reserved for bounded ambiguous pattern questions such as automation/testing/tool-building/maintenance tendencies; it should not rediscover deterministic language/framework facts.
- Added the conversational LLM role: profile interviewer/synthesizer that asks targeted questions about role, intent, AI usage and career changes, with answers preserved as self-reported evidence rather than promoted to fact.
- Added optional LinkedIn-like source semantics: `declared + supported`, `declared + not observable`, `observed + undeclared`, and ambiguous/reconcile cases. `Not observable` is never treated as `false`.
- Made WidgetForge a first-class presentation boundary for technology evolution, project-domain mix, maintenance/release cadence, automation/testing/documentation footprints, project cards and contribution visuals such as the commit snake. Widget values represent observed prevalence, not skill level.
- Reordered roadmap priorities: deterministic GitHub/profile metrics and cross-project tendencies precede stronger agent-receipt integrations; external workflow receipts move to optional enrichment.
- Documentation-only reframe; no production code changed and the previous code verification baseline remains JS 54/54 + Rust 28/28 PASS.


## Legacy runtime cleanup closed

- Finalized the migrate / reference-only / delete classification in `docs/MIGRATION_FROM_LEGACY.md`.
- Removed the obsolete Electron/Designer runtime under `src/main/**` and `src/renderer/**`, plus root helpers/launchers and stale active Designer documentation after verifying `src/core/` had no legacy imports.
- Preserved historical context under `docs/archive/`, `docs/legacy/` and Git history rather than keeping dead runtime code as an active dependency surface.
- Replaced the stale Designer documentation index with a current GitTeach documentation index.
- Simplified JavaScript package metadata to Node's built-in test runner with no npm runtime/dev dependencies; the regenerated package lock audits only the project package.
- A live-tree grep excluding archive/legacy material found no remaining active references to `src/main`, `src/renderer`, Electron or the old Designer phase language.

## F5 deterministic development tendencies — first slice

- Added shared JS/Rust `giteach-development-tendencies-v1` plus a shared schema fixture.
- Initial deterministic tendency families: testing/verification, automation, documentation, tooling/configuration and CI/delivery.
- A tendency requires support from at least two independent repositories. Each repository contributes at most one prevalence unit regardless of file count, so a large repository cannot inflate the profile by volume.
- Provenance keeps one representative evidence ref per supporting repository while still inspecting all matching evidence kinds.
- No tendency emits expertise/seniority scores; prevalence describes observed cross-project presence only.
- Stored GitTeach + Kode evidence snapshots produced automation, documentation and tooling/configuration at 2/2 repositories, with two evidence refs per tendency. These are stored snapshots rather than a post-cleanup rescan.
- Final verification: JS 60/60 PASS; Rust 30 unit + 4 integration = 34/34 PASS; `cargo fmt --check`, strict clippy and `git diff --check` PASS.
- No commit or push was requested.


## F5 deterministic repository + portfolio lifecycle

- Added shared JS/Rust `giteach-repository-lifecycle-v1` for local Git history: commit count, first/latest commit, active calendar months/years, reachable local tags and commits after the latest reachable tag.
- Rust `collect_repository_lifecycle()` reads real local Git history. Tag discovery is restricted to tags reachable from current `HEAD`, preventing an unrelated branch tag from creating a false post-tag-maintenance sequence.
- Local Git tags are explicitly not GitHub Releases. GitHub release metadata remains a separate future connected-source fact.
- Added shared JS/Rust `giteach-portfolio-lifecycle-v1` to aggregate repositories with history, multi-month history, reachable tags and post-tag work. Duplicate snapshots for one repository cannot inflate portfolio counts.
- Lifecycle activity is descriptive evidence only: commit volume, active-month count and post-tag commits never become expertise, quality or seniority scores.
- Real local canary: GitTeach currently exposes 1 committed change, 1 active month and 0 reachable tags; the large rebuild remains uncommitted, demonstrating why Git history alone is an intentionally incomplete view of current work. Kode exposes 47 commits, 1 active month, reachable tag `v0.1.0-p4` and 14 commits after that tag.
- Final verification: JS 70/70 PASS; Rust 38 unit + 4 collector integration + 2 lifecycle integration = 44/44 PASS; `cargo fmt --all -- --check`, strict clippy and `git diff --check` PASS.
- No commit or push was requested.


## F5 connected GitHub facts + attributable collaboration

- Added shared JS/Rust `giteach-github-repository-facts-v1` for deterministic connected GitHub facts: Releases, pull requests, reviews and true issues.
- Added stable GitHub fact refs `github:<owner/repo>:<kind>:<source-id>` and a JS adapter into `EvidenceLedger` so downstream claims can resolve exact GitHub provenance.
- Added provider-neutral domain construction plus JS `GitHubRestFactsAdapter`; REST/API transport details stay outside the profile domain.
- GitHub Issues responses carrying a `pull_request` marker are excluded from issue facts, preventing GitHub's PR-as-issue representation from double-counting collaboration.
- Local Git tags remain distinct from GitHub Releases; a tag never implies a Release.
- Added JS/Rust GitHub fact -> ActorEvidence conversion: connected-login authored PR emits `authored-change` with origin `unknown`; a submitted non-PENDING review emits `reviewed-change`; pending reviews, Releases and issues do not fabricate engineering agency.
- Added `scripts/github-public-canary.mjs` for bounded public REST smoke verification without private credentials. After a later unauthenticated 403/rate-limit response, the canary was hardened to serialize requests, expose `x-ratelimit-*`/`retry-after` information and degrade optional review/issue probes instead of crashing.
- Public canary for `mauro3422`: 30 public repos observed and 5 authored public PRs returned by GitHub search at canary time. `AllTheMods/All-the-mods-10-Sky#821` produced one merged PR fact, one ledger record and one identity-linked `authored-change`; implementation origin remained `unknown`.
- Final verification: JS 80/80 PASS; Rust 44 unit + 4 collector integration + 2 lifecycle integration = 50/50 PASS; fmt-check, strict clippy and `git diff --check` PASS; public REST canary PASS.
- No commit or push was requested.


## F5 — GitHub REST transport and bounded repository collector

- Added read-only `GitHubRestClient` outside the profile/domain model.
- Transport now serializes reads, follows GitHub `Link` pagination within explicit page/item budgets, uses conditional requests, enforces timeouts, rejects cross-origin continuation URLs, sanitizes auth/network errors, and exposes rate-limit/backoff state without automatic retry loops.
- Authenticated HTTP cache is fail-safe: disabled unless the caller provides a stable non-secret connection partition. Public URL-key compatibility is preserved and separate authenticated partitions cannot share representations.
- Added `GitHubRepositoryFactsCollector` for bounded Releases/PRs/issues collection. Review endpoints are queried only for explicitly selected PR numbers; requested/queried/omitted pull counts and truncation remain visible.
- Added transport, hardening, collector and local-HTTP integration tests. The integration path proves `HTTP -> GitHubRestClient -> GitHubRepositoryFactsCollector -> GitHubRepositoryFacts`.
- Final verification: JavaScript 106/106 PASS; Rust 50/50 PASS; fmt-check, strict clippy and `git diff --check` PASS.


## F5 — Cross-repository GitHub collaboration summary

- Added shared JS/Rust `giteach-github-collaboration-summary-v1` derived only from already-collected GitHub facts plus explicit collection coverage.
- Metrics keep observed activity counts separate from supporting independent-repository counts; no expertise, seniority or quality score is produced.
- Repository observations are deduplicated, mixed connected logins fail closed, evidence refs are bounded independently from exact observed counts, and partial base/review coverage remains visible.
- Review coverage remains explicitly `targeted`: requested/queried/omitted PR counts are retained and whole review history is never labeled complete from targeted review calls.
- Corrected `connectedActorActivity.submittedReviewCount` in JS/Rust: a `PENDING` review remains an observed fact but does not count as submitted activity without an actual submission timestamp. This now matches actor-evidence and collaboration semantics.
- Added shared schema fixture plus JS/Rust tests for deduplication, coverage, submitted-review semantics, bounded provenance and identity isolation.
- Final verification: JavaScript 114/114 PASS; Rust 57/57 PASS; fmt-check, strict clippy and `git diff --check` PASS.


## F5 — deterministic observability/benchmarking + repository domains

- Extended shared JS/Rust `giteach-development-tendencies-v1` with observability and benchmarking as deterministic repeated profile signals.
- Added a bounded collector `profile-signal` evidence path so benchmark/telemetry/observability files survive independently from generic source-sampling budgets.
- Added shared JS/Rust `giteach-repository-domain-fingerprint-v1`: explainable multi-label domain candidates from technology/language signals plus optional declared GitHub Topics.
- Added read-only GitHub repository Topics support to `GitHubRestClient`; malformed topic payloads fail closed.
- Domain candidates deliberately have no winner, confidence, expertise, seniority or quality score. A language alone cannot fabricate a broad domain, and an empty deterministic fingerprint is valid.
- Bounded candidate provenance to at most 6 repository evidence refs plus 2 Topic refs.
- Real canaries: Kode -> desktop application + developer tooling + web application; incremental-farm -> game development; GitTeach -> deterministic abstention/no domain candidate from current local tech/language evidence.
- Final hardened incremental-farm canary retained 6 evidence refs instead of the earlier 24 while preserving the same Godot/GDScript domain conclusion.
- Final verification: JavaScript 123/123 PASS; Rust 58 unit + 5 collector integration + 2 lifecycle integration = 65/65 PASS; strict Clippy, fmt-check and `git diff --check` PASS.
- No commit or push was requested.


## F5 closed — persistent incremental Jev observations

- Added shared JS/Rust `giteach-jev-observation-v1` and `giteach-incremental-jev-plan-v1` contracts.
- Jev execution is now one candidate + only that candidate's bounded selected evidence. Exact evidence/question/context/provider-policy identity is fingerprinted; unrelated evidence does not invalidate an observation.
- Added explicit `reuse`, `refresh` and `skip-no-evidence` planning. Zero-evidence candidates never trigger provider calls.
- TypeSafe semantic wording now judges project capabilities/characteristics rather than claiming developer authorship/expertise.
- Provider-policy identity includes decision contract, requested model and acceptance threshold. Added configurable bounded observation age so floating model aliases are not reused indefinitely.
- Added shared JS/Rust `giteach-jev-observation-store-v1`; current JSON store is a local CLI/dev adapter, preserves historical changed observations and does not persist raw evidence excerpts.
- Added shared observation/store schema fixtures and parity tests.
- Real Kode live canary: Rust 0.98 + Monaco 0.97 from 6 selected evidence records; Kubernetes no-match skipped; first pass 2 TypeSafe calls and 4,707 input / 44 output tokens; exact second pass 0 calls; changing only Rust evidence text caused exactly 1 refresh while Monaco reused.
- Cross-process persistence canary proved `seed=2 calls`, fresh credential-free `reuse=0 calls`, and `rust-change=1 call`; store retained 3 historical observations after the changed Rust run.
- Final F5 verification: JavaScript 138/138 PASS; Rust 66 unit + 5 collector integration + 2 lifecycle integration = 73/73 PASS; `cargo fmt --check`, strict Clippy and `git diff --check` PASS.
- F5 is closed. F6 profile-source declarations + conversational interviewer is next.
- No commit or push was requested.


## F6 — profile declarations, reconciliation and interview planning

- Added/verified shared JS/Rust `giteach-profile-declaration-v1` for direct user answers and explicitly authorized profile imports as a declarative evidence class separate from repository facts and ActorEvidence.
- `profile-import` requires `authorizationRef`; raw prompts, transcripts and credential-shaped fields remain forbidden.
- Added explicit publication consent: declarations default to `publicationStatus=private` and may become `approved` only by explicit user choice. Publication state is policy metadata and does not change declaration identity.
- Reconciliation preserves `declared-supported`, `declared-not-observable`, `observed-undeclared` and `ambiguous`. Missing connected evidence is never treated as `false`.
- Conflicting authorized declarations for the same normalized key/value family remain ambiguous instead of silently preferring user-answer, imported profile or observed evidence.
- Extended declaration categories with `development-tendency` so cross-project patterns such as automation/testing are not mislabeled as generic skills.
- `giteach-profile-interview-plan-v1` now asks only for bounded profile gaps: missing personal categories, ambiguity reconciliation, observed-pattern confirmation and clarification of corroboratable unobserved capabilities/tendencies. Role/intent/career/AI-workflow self-report does not trigger redundant repository-observability questions.
- Added shared schema parity and JS/Rust tests for publication consent, declaration-source conflict, actor isolation and question-category behavior.
- Final verification: JavaScript 157/157 PASS; Rust 81 unit + 5 collector integration + 2 lifecycle integration = 88/88 PASS; `cargo fmt --check`, strict Clippy and `git diff --check` PASS.
- No real LinkedIn/profile provider is connected yet; F6 intentionally stops at provider-neutral declarations/interview planning for this slice.
- No commit or push was requested.


## F6 closed — real interview path + declaration publication firewall

- Existing JS/Rust observation adapters now feed real `DeveloperProfile` / `DevelopmentTendencies` outputs into reconciliation; no hand-built observation is required for the normal path.
- Bounded interviewer wording and answer conversion are verified: answers remain `user-answer` declarations and default to private publication status.
- Real rescans of GitTeach + Kode produced cross-project automation and documentation tendencies in 2/2 repositories and generated evidence-backed `confirm-observed-pattern` prompts.
- Added shared JS/Rust `giteach-profile-publication-context-v1`. It revalidates declarations, isolates the subject actor, admits only explicit `approved` declarations, and removes authorization refs/source hashes/source refs/publication metadata from the public payload.
- Added end-to-end regression proving deterministic tendency -> interview -> private declaration -> explicit approval -> bounded publication context.
- Concrete LinkedIn-like/network profile providers remain optional F8 adapters; F6 closes at the provider-neutral declaration/interview/publication boundary.
- Final verification: JavaScript 173/173 PASS; Rust 91 unit + 5 collector integration + 2 lifecycle integration = 98/98 PASS; fmt-check, strict Clippy and `git diff --check` PASS.
- F6 is closed; F7 WidgetForge/personalized presentation is active.
- No commit or push was requested.

## F7 — historical technology evolution from real Git trees

- Added shared JS/Rust `giteach-technology-evolution-v1` for bounded historical repository language/file/byte composition.
- Rust collector reads real commit history and historical Git trees without checkout; integration tests prove branch, HEAD and working-tree status remain unchanged.
- Added deterministic `evenly-spaced-commits-v1` sampling: complete history is retained when it fits the budget; otherwise first/latest commits plus real deterministic intermediate commits are selected. No interpolated/synthetic points are emitted.
- Historical sampling coverage is explicit through `commitCount`, `snapshotCount`, `maxSnapshots` and `completeHistory`.
- Timeline values are repository composition, never developer skill/expertise/seniority progression; uncommitted work is not backfilled into Git history.
- Real canary GitTeach: 1 committed snapshot with 423 recognized source files (JavaScript 385, CSS 25, Python 7, HTML 6); current rebuild remains uncommitted and therefore absent from historical Git.
- Real canary Kode: 47 commits -> 8 sampled real snapshots. Recognized source files grow from 8 at the first sampled commit to 100 at the latest; Rust 3 -> 34, TypeScript 1 -> 27 and Svelte 1 -> 23 across sampled commit trees.
- Added WidgetForge-oriented state documentation and durable no-checkout/no-interpolation rule.
- Final verification: JavaScript 189/189 PASS; Rust 103 unit + 5 collector integration + 2 lifecycle integration + 2 technology-evolution integration = 112/112 PASS; fmt-check, strict Clippy and `git diff --check` PASS.
- No commit or push was requested.


## F7 — personalized presentation and WidgetForge handoff closure

- Added shared JS/Rust `giteach-profile-presentation-v1` to compose deterministic `ProfileStatistics v1`, per-repository `TechnologyEvolution v1` and explicitly approved `ProfilePublicationContext v1` as separate planes.
- Added shared JS/Rust `giteach-profile-widget-plan-v1`; only non-empty supported planes create semantic widget descriptors and targeted collaboration requires explicit coverage.
- Added shared JS/Rust `giteach-profile-widget-data-v1`; each widget receives only its referenced source plane/section/repository rather than the full presentation payload.
- Added shared JS/Rust `giteach-profile-surface-composition-v1`; `github-profile-readme` and `portfolio` contain semantic sections with widget ids only, without copied widget data or HTML/SVG/theme rendering concerns.
- Existing F4 document surfaces remain the project/LinkedIn/CV prose path, so F7 does not duplicate text-generation authority.
- Real GitTeach + Kode presentation canary materialized only technology/tendency/domain widgets from the supplied planes; no timeline, collaboration or highlight widget was fabricated. GitHub README orders Technology before Development patterns while Portfolio reverses those two sections.
- Final F7 verification: JavaScript 212/212 PASS; Rust 117 unit + 5 collector integration + 2 lifecycle integration + 2 technology-evolution integration = 126/126 PASS; `cargo fmt --all -- --check`, strict Clippy and `git diff --check` PASS.
- Recovery verification on 2026-09-24 reproduced the same full gate with exit code 0 after confirming no GitTeach Bridge background task remained active.
- F7 is closed; F8 optional external evidence/profile adapters is next.
- No commit or push was requested.


## F8 started — local-first product + managed repository workspace

- Recovered full Git history before designing the next product phase. The root commit `bce98b4` confirms legacy GitTeach was already an Electron desktop application.
- Audited the legacy acquisition/cache path instead of guessing: it used GitHub REST recursive trees plus Contents API downloads, with repository tree SHA and per-file SHA/snippet cache; later offline/cache-first work reused unchanged snippets but could still fan out REST work and did not have the rebuild transport's centralized backoff boundary.
- Product direction is now desktop-first/local-first: Tauri 2/webview over the Rust core, with no required hosted analysis server.
- Source/history acquisition moves to persistent local Git workspaces. Existing local repos can be analyzed in place; remote repos are clone-once/fetch-later. GitHub REST stays focused on metadata and GitHub-specific collaboration facts.
- Added Rust `giteach-repository-workspace-v1` with safe app-owned repository paths, initial `git clone --filter=blob:none`, later `fetch --prune --tags` + fast-forward, origin mismatch protection, detached-HEAD refusal and rejection of HTTP credentials embedded in clone URLs.
- Added a real local-Git integration test proving `Cloned -> Updated -> Unchanged` across a bare remote and persistent cache path.
- Reordered future product work: F9 local SQLite persistence, F10 profile UX/real outputs, F11 optional external adapters, F12 concrete WidgetForge rendering.
- No commit or push was requested.


## F8.1 corrected — metadata/hash audit cache + transient hydration

- Superseded the initial clone-once remote-worktree direction after clarifying the product requirement: GitTeach needs to analyze remote repositories and audit them over time, not keep a second durable copy of their source.
- Added Rust `giteach-repository-audit-cache-v1`: a persistent bare blobless cache records current branch/commit/tree identity plus a filtered path -> Git blob-OID inventory without a checked-out worktree.
- Remote refresh resolves HEAD first and only fetches a shallow `--filter=blob:none` current tree when the commit changes; snapshot deltas identify added/modified/deleted paths from blob identity before source hydration.
- Added bounded path-only target selection for manifests, documentation, tests, tooling/profile signals and representative source files before downloading file contents.
- Selected blobs are hydrated through a temporary blobless Git object store, SHA-256 hashed/analyzed in memory, and discarded with the temporary store. Integration coverage proves the hydrated source blob remains absent from the persistent audit cache.
- Added `giteach-repository-audit-history-v1` as the portable pre-SQLite longitudinal adapter. It persists commit/tree/path/blob identities and commit time, dedupes repeated commit/tree receipts, and stores neither source bytes nor the local audit-cache path.
- The earlier `giteach-repository-workspace-v1` clone-once implementation remains tested reference/fallback and is no longer the normal remote-analysis path.
- Full verification after the correction: Rust 120 unit + 5 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution = 131/131 PASS; JavaScript 212/212 PASS; `cargo fmt --all -- --check`, strict Clippy and `git diff --check` PASS.
- No commit or push was requested.


## F8.1 closed — selective hydration reaches profile statistics without false full-repository coverage

- Connected the blobless remote audit path directly to `RepoEvidenceCollector`: bounded selected blobs are hydrated only in the temporary Git object store, analyzed there, and annotated with their Git blob OID, hydrated SHA-256 and audit-tree identity before the temporary store is discarded.
- Added explicit repository coverage to `RepoEvidenceBundle`: inventory coverage, summary scope and known path count. Local full policy-filtered scans report inventory scope; remote selective hydration reports selected-content scope while retaining the complete filtered audit-tree path count.
- Backward compatibility is fail-closed: a v1 bundle that predates the coverage field deserializes as partial + selected-content rather than silently claiming complete coverage.
- `TechnologyFootprint v1` now aggregates coverage separately from technology/language values, including complete/partial inventory counts, inventory-vs-selected-content summary counts, known paths and summarized paths.
- `ProfileStatistics v1` preserves that technology coverage downstream, and the JS `RepoEvidenceAdapter` keeps the per-repository coverage receipt in the EvidenceLedger.
- This closes the semantic bug where a bounded hydrated sample could otherwise look like total repository file/byte volume. Selected evidence remains useful for deterministic profiling while its scope stays visible.
- Final verification: JavaScript core 213/213 PASS; Rust 121 unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution = 133/133 PASS; `cargo fmt --all -- --check`, strict Clippy and `git diff --check` PASS.
- F8.1 is closed. The next active product step is F8.2: the Tauri 2 desktop shell over the Rust core.
- No commit or push was requested.


## F8.2 first desktop slice — Tauri shell reaches the Rust collector locally

- Added `crates/giteach-desktop` as the first Tauri 2 product shell over `giteach-core`; the runtime is local-first and does not require a hosted analysis service.
- Added `runtime_info` so the webview can verify the native/local-first runtime contract before analysis.
- Added `analyze_local_repository`, executed through Tauri's blocking-task runtime so repository collection does not run on the UI thread.
- Introduced bounded `giteach-local-repository-analysis-v1` output for the webview: repository identity, explicit repository coverage, aggregate summary counts, languages and technology signals only. Raw `EvidenceRecord` payloads, excerpts, metadata and source bodies do not cross this boundary.
- Added the first webview under `src/core/app/`: manual local-repository path entry, runtime state, coverage badge, repository metrics, languages and technology signals. Browser-only preview fails closed by disabling native analysis.
- Added a restrictive local CSP and ignored Tauri-generated capability autocomplete schemas; the required Windows icon is stored as desktop application source.
- Added JS view-model tests for contract validation, coverage visibility and deterministic byte formatting, plus Rust desktop tests for the local-first runtime contract and bounded collector response.
- Verification: JavaScript core 216/216 PASS; Rust 121 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 2 desktop = 135/135 PASS; `cargo fmt --all -- --check`, strict Clippy and `git diff --check` PASS.
- F8.2 remains IN PROGRESS. Next: repository connection/selection UX, remote audit refresh/selective hydration in the desktop flow, bounded evidence/profile inspection, then the existing F6 interview/output path.
- The durable project architecture was reviewed and already states Tauri 2 + webview + local-first Rust core, so no `PROJECT_CONTEXT` architecture rewrite was necessary.
- No GUI was launched during automated QA, and no commit or push was requested.


## F8.2 second desktop slice — local/remote repository acquisition reaches the real audit path

- Added typed desktop `RepositoryTarget` input for both local folders and remote Git repositories. The original bounded local command remains available for compatibility while the UI now uses the unified `analyze_repository` path.
- Added `DesktopState` with the remote audit-cache root under Tauri app-local data. Remote analysis reuses the existing `RepositoryAuditCacheManager`: refresh the persistent blobless audit tree, hydrate only selected blobs in a temporary Git object store, collect bounded evidence, then discard those transient source objects.
- Added bounded `giteach-repository-analysis-v1` for the webview. It exposes acquisition kind/audit action, repository identity, explicit coverage, aggregate summary counts, languages and technology signals only.
- Remote URL, audit-cache path, raw `EvidenceRecord`, excerpts, hydrated hashes and source bodies are intentionally absent from the desktop result. Git/audit failures are mapped to bounded sanitized messages rather than forwarding raw stderr or filesystem paths.
- Extended the webview with manual local/remote connection fields and acquisition-state display. Remote `initialized` / `updated` / `unchanged` status is shown separately from `inventory` / `selected-content` coverage.
- Added desktop integration coverage using a real temporary Git repository as the remote source. The test proves `initialized -> unchanged`, selected-content coverage and absence of source text, remote/cache paths and internal audit metadata from the serialized UI DTO.
- Full verification: JavaScript core 218/218 PASS; Rust 121 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 5 desktop = 138/138 PASS; `cargo fmt --all -- --check`, strict Clippy and `git diff --check` PASS.
- The pre-mutation Bridge workspace snapshot became unavailable after a Bridge lifecycle change. This was recorded as verification friction; no snapshot result was invented, and the live dirty worktree was instead reviewed with explicit Git status/diff plus the full test gate.
- F8.2 remains IN PROGRESS. Next active boundary: bounded evidence/profile inspection in the desktop, then the existing F6 interview/output path. Richer native picker/persisted connection UX can evolve without redefining the acquisition contract.
- No GUI was launched during automated QA, and no commit or push was requested.


## F8.2 third desktop slice — bounded repository evidence becomes inspectable without fabricating personal experience

- Added `inspect_repository` as the desktop inspection path. It reuses the same single local/remote acquisition used by analysis, so remote inspection still follows the blobless audit-cache path with transient selected hydration rather than creating a persistent checkout or duplicating collection work.
- Added `giteach-repository-inspection-result-v1`: the existing bounded `giteach-repository-analysis-v1` plus a repository-only inspection plane. The inspection exposes at most 48 evidence records and each record contains only stable evidence id, repository-relative path, evidence kind and byte count.
- Reused the deterministic repository-domain fingerprint for the first inspectable project-profile signal. A domain is emitted to the desktop only when its evidence refs resolve inside the visible bounded evidence set; unresolved provenance is omitted rather than guessed.
- The attribution boundary is explicit: `scope = repository-only` and `personalExperienceClaimed = false`. Repository evidence is not promoted to personal capability/experience. Raw source bodies, excerpts, source/excerpt hashes, metadata, remote URL/cache path, confidence, seniority and skill-score semantics remain outside the webview contract.
- Extended the webview with Project domains and Bounded evidence panels. The JavaScript view-model validates the inspection schemas, evidence-count invariants, unique visible refs and project-domain provenance, and fails closed if a payload claims personal experience or references evidence outside the bounded visible set.
- Remote integration coverage now also runs the inspection path after `initialized -> unchanged` and proves that raw source text, cache/source paths and internal hydration/hash metadata remain absent from the serialized inspection result.
- Full verification: JavaScript core 221/221 PASS; focused desktop view-model 8/8 PASS; Rust 121 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 6 desktop = 139/139 PASS; `cargo fmt --all -- --check`, strict Clippy and `git diff --check` PASS.
- The pre-slice Bridge snapshot was usable only as bounded evidence because it truncated after 1800 files; generated `target/` churn dominated the snapshot diff, so the seven slice paths were also reviewed explicitly and `git diff --check` was rerun on them. No rollback coverage was invented.
- F8.2 remains IN PROGRESS. Next active boundary: connect the existing cross-repository/profile and ActorEvidence contracts to desktop inspection so personal-profile claims display attribution class plus resolvable evidence refs; then wire the existing F6 interview/output path.
- No GUI was launched during QA, and no commit or push was requested.

## F8.2 fourth desktop slice — cross-repository personal attribution stays evidence-resolvable

- Added `inspect_profile` and `giteach-personal-profile-inspection-v1`. The desktop can accumulate repositories inspected during the current session and submit an explicit subject actor key plus configured Git name/email into the existing `DeveloperProfile` + `ActorEvidence` attribution path.
- Local Git attribution reuses `collect_git_actor_evidence()`: an exact configured author/coauthor match establishes `identity-linked` contribution only and keeps implementation origin `unknown`; it does not prove manual implementation, design ownership or engineering judgment. Remote repositories currently have no equivalent desktop actor producer, so they stay repository-only rather than being promoted.
- Personal attribution remains fail-closed after aggregation. For each visible capability, the desktop keeps only repository support refs exactly targeted by contributing ActorEvidence. A capability supported by both matched and unmatched repositories therefore exposes only the matched repository evidence; repository-only capabilities and unresolved actor/support provenance are omitted.
- The personal payload is bounded atomically to at most 32 repository targets, 24 attributable capability rows, 192 repository evidence records and 96 actor-evidence records. Every shown capability support ref, actor ref and actor target ref resolves inside the same payload, so a capability is omitted rather than partially truncating its provenance.
- Extended the webview with a personal-profile builder and result panels. The JavaScript view-model rejects repository-only promotion, missing subject identity, inconsistent bounds/counts, unresolved support/actor/actor-target refs and score/seniority/confidence-shaped semantics.
- Added a mixed-repository desktop regression: two React repositories support the same deterministic Web application capability, but only the repository authored by the configured Git identity reaches the personal profile; the unmatched repository and a repository-only Godot signal remain excluded.
- Full verification: JavaScript core 224/224 PASS; focused desktop view-model 11/11 PASS; Rust 121 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 7 desktop = 140/140 PASS; `cargo fmt --all -- --check`, strict Clippy, Node syntax checks and `git diff --check` PASS.
- A new Bridge pre-slice snapshot could not be created because snapshot storage quota was exhausted. No rollback/snapshot evidence was invented; verification instead used patch postflights, focused regressions, the full JS/Rust gates, formatting/linting and live Git checks.
- `PROJECT_MEMORY.md` was reviewed for the MSSR maintenance notice. Its existing attribution/provenance decisions already cover this slice, so no durable-memory rewrite is needed.
- F8.2 remains IN PROGRESS. Next active boundary: wire the already-verified F6 interview/reconciliation/publication/output contracts into the desktop flow while keeping answers private until explicit publication approval.
- QA remained headless, and no commit or push was requested.


## F8.2 fifth desktop slice — bounded interview, explicit publication approval and safe drafts close the vertical slice

- Added `prepare_profile_interview` + `giteach-profile-interview-session-v1`. The desktop reconstructs a safe personal `DeveloperProfile` only from the already-bounded actor-linked inspection, feeds that into the existing F6 observation/reconciliation/interview planner and returns at most 32 unresolved prompts whose evidence refs resolve inside the same repository/actor evidence payload.
- Added `answer_profile_interview`. Answers are converted through the existing F6 adapter and are always returned as private `ProfileDeclaration v1`; answering a question never grants publication consent.
- Added `generate_profile_outputs` + `giteach-profile-output-bundle-v1`. `approvedDeclarationIds` is the explicit publication authority: unknown ids fail closed and every declaration not explicitly selected is forced back to `private` before `ProfilePublicationContext v1` is prepared.
- The output bundle keeps approved self-report separate from five personal document targets (`github-profile-readme`, `portfolio-card`, `linkedin-project`, `linkedin-skills`, `cv-evidence`). Each target is a sanitized projection of the existing F4 `DocumentInput`; raw evidence objects, repository paths, source/excerpt hashes, remote/cache paths and internal authorization/source metadata do not cross into the webview.
- The webview now exposes a guided profile section: prepare only remaining questions, save answers privately, approve individual declarations with explicit checkboxes and render the five evidence-backed drafts through the existing deterministic `DocumentDraftRenderer`. Changing selected repositories clears this guided-session state so stale answers/approval are not silently reused against a different repository set.
- Added focused regressions for prompt provenance, private-by-default answers, explicit approval, document rendering and webview leakage rejection. A Rust integration fixture proves an answer remains unpublished with no approval id and appears in publication context only after its own id is explicitly approved.
- Full F8.2 close verification: JavaScript core 228/228 PASS; focused desktop view-model 15/15 PASS; Rust 121 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 8 desktop = 141/141 PASS; `cargo fmt --all -- --check`, strict Clippy, Node syntax checks and `git diff --check` PASS.
- F8 is now closed end-to-end. F9 is next and will persist repository connections, audit/evidence/profile snapshots, private declarations, publication consent, refresh metadata and semantic cache identity in SQLite without making raw remote source bodies normal durable state.
- QA remained headless, and no commit or push was requested.


## F9.1 — SQLite repository connections and audit identity survive restart

- Added Rust `SqliteProductStore` as the first real product persistence layer. Tauri stores it under app-local data as `giteach-product.sqlite3`; schema version 1 is explicit through SQLite `user_version` and unknown future versions fail closed.
- Successful local/remote repository analysis and inspection now upsert stable repository-connection rows instead of keeping connection history only in the current webview session.
- Local rows retain normalized reconnectable path plus latest repository/branch/head, acquisition, coverage and bounded summary counts.
- Remote rows retain reconnectable owner/name/remote URL plus latest branch/head/commit time and audit action; separate receipt tables keep commit/tree and path/blob OIDs for longitudinal audit identity.
- Persistence rejects embedded HTTP credentials and requires a remote audit receipt to match the target before writing it.
- Raw hydrated source bodies, excerpts, hydrated hashes, audit-cache paths and temporary Git object-store paths are deliberately absent from normal SQLite product state.
- Added bounded `giteach-repository-connection-list-v1` and `list_repository_connections`. The webview loads remembered repositories after restart and can add one back to the current profile selection without recreating ActorEvidence, declarations or publication consent implicitly.
- The remembered webview DTO deliberately omits tree/blob OIDs and other audit internals; those remain behind the Rust persistence boundary.
- Final verification: JavaScript core 231/231 PASS; focused desktop view-model 18/18 PASS; Rust 125 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 9 desktop = 146/146 PASS; `cargo fmt --all -- --check`, strict Clippy `-D warnings`, Node syntax checks and `git diff --check` PASS.
- F9 remains active. Next: persist bounded analysis/evidence/profile snapshots, then private declarations/publication consent and semantic-cache identity/reuse. Raw remote source remains transient by default.
- QA remained headless, and no commit or push was requested.


## F9.2a — bounded repository derived snapshots survive restart

- Upgraded `SqliteProductStore` to schema version 2 and added `giteach-repository-derived-snapshot-v1` without discarding schema-v1 repository connections.
- A persisted derived snapshot contains only the existing safe repository inspection plane: analysis/coverage summary, languages/technologies, at most 48 evidence receipts (`id/path/kind/bytes`) and deterministic project-domain provenance with refs resolvable inside that bounded set.
- Full `RepoEvidenceBundle` records are deliberately not persisted as product snapshots: source excerpts, arbitrary evidence metadata, source/excerpt/hydration hashes, raw remote source bodies and audit-cache/object-store paths stay outside normal durable state.
- A repository connection changing committed `HEAD` invalidates the previous derived snapshot. Local uncommitted changes remain a separate freshness concern because `HEAD` can stay unchanged; the restored webview explicitly presents the data as a previous bounded view and tells the user to re-inspect before relying on current state.
- Added `load_repository_snapshot` and a remembered-repository `Restore view` action. Restore reuses `giteach-repository-inspection-result-v1` and cannot implicitly recreate ActorEvidence, personal profile attribution, declarations or publication consent.
- Regression coverage proves schema v1→v2 migration, restart restore, committed-HEAD invalidation and absence of raw source/excerpt/hash/cache internals in restored output.
- Final verification: JavaScript core 231/231 PASS; focused desktop view-model 18/18 PASS; Rust 128 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 9 desktop = 149/149 PASS; `cargo fmt --all -- --check`, strict Clippy `-D warnings`, Node syntax checks and `git diff --check` PASS.
- F9 remains active. Next: bounded personal-profile derived snapshots by stable actor/repository-set identity, then private declaration/publication-consent persistence and semantic-cache/retention work.
- QA remained headless, and no commit or push was requested.

## F9.2b — bounded personal profile snapshot persistence

- SQLite product schema advanced to v3 with `giteach-personal-profile-derived-snapshot-v1` while preserving v1/v2 migration paths and existing repository-derived state.
- Personal-profile continuity now persists only the bounded `giteach-personal-profile-inspection-v1` plane: attributable capabilities, bounded repository evidence receipts, bounded actor-evidence provenance and inspection counts/omission metadata.
- Snapshot identity is derived from the normalized exact actor matcher plus an order-independent unique repository-target set. Plaintext Git name/email matchers are not stored as profile payload, duplicate repository targets fail closed, and changed matchers or repository sets cannot cross-load another snapshot.
- Repository-only capabilities and unresolved evidence/actor provenance are rejected before persistence or restore.
- Desktop `load_profile_snapshot` plus **Restore saved profile** reuse the existing personal-profile inspection contract. Restore deliberately clears private declarations and publication approvals rather than treating prior answers/consent as implied durable state.
- A restored personal profile is last-known derived continuity state, not freshness proof; repository identity alone does not prove current contents, so re-inspection remains required before relying on current state.
- Verification on the final source: `npm run test:core` 231/231 PASS; focused desktop view-model 18/18 PASS; Rust workspace 154/154 PASS (132 core unit + 6 collector + 1 audit + 2 lifecycle + 1 workspace + 2 technology evolution + 10 desktop); fmt, strict Clippy `-D warnings`, Node syntax and `git diff --check` PASS.
- QA remained headless. No commit/push was requested.
- Next F9 slice: persist private declarations and explicit per-declaration publication consent without weakening the F8 publication firewall, then semantic-cache reuse and retention/migration policy.


## F9.3a — private interview answers survive restart while publication stays locked

- SQLite product schema advanced to v4 and adds bounded private `ProfileDeclaration v1` persistence under the exact F9.2b personal-profile identity.
- Only direct `user-answer` declarations are accepted in this phase, with a maximum of 64 per exact profile. Profile imports remain outside this persistence slice.
- Durable declaration JSON deliberately omits `publicationStatus`, `authorizationRef` and `sourceHash`; reload reconstructs `publicationStatus=private`. Attempts to persist an approved declaration, authorization/source-hash metadata or a declaration from another actor/profile scope fail closed.
- Schema v1/v2/v3 migrates to v4 without losing repository connections, repository-derived snapshots or personal-profile snapshots.
- Desktop `save_private_profile_declaration` and `load_private_profile_declarations` now save/reload private interview answers after restart for the same normalized actor matcher + unique repository set.
- Publication/approval remains disabled during extended testing through three product layers: the webview exposes no approval checkbox and keeps its publication button locked, JS `PROFILE_PUBLICATION_ENABLED=false`, and the public Tauri `generate_profile_outputs` command rejects publication. The SQLite layer independently rejects `Approved`, so changing only presentation code cannot grant consent.
- Guided-profile activation uses a generation token so a stale asynchronous private-declaration restore cannot overwrite a newer profile selection.
- The lower-level F8 publication contract remains regression-tested for future use, but it is dormant product behavior and grants no current publication permission.
- Final verification: `npm run test:core` 232/232 PASS; focused desktop-shell 19/19 PASS; Rust workspace 158/158 PASS (135 core + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 11 desktop); `cargo fmt --all -- --check`, strict Clippy `-D warnings`, Node syntax and `git diff --check` PASS.
- QA remained headless. No commit/push was requested.
- Publication consent is intentionally deferred. F9 may continue with semantic-cache persistence and retention/cleanup while the publication lock remains in place for extended testing.
