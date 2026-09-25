# GitTeach

GitTeach builds **personalized, evidence-backed developer profiles for the AI era**.

It is not a code-authorship detector, coding agent, semantic code-search engine or codebase-governance system. Its job is to learn what a person repeatedly builds, maintains, verifies, automates, reviews and ships across projects, then turn those observations into an auditable professional profile.

The product must remain useful even when AI wrote much of the implementation.

## Core rule

A professional claim without explainable evidence is not a claim GitTeach may publish.

```text
GitHub / Git repositories
  -> deterministic facts + statistics
  -> cross-project tendencies
  -> bounded semantic interpretation when needed
  -> optional user / LinkedIn declarations
  -> personalized DeveloperProfile
  -> GitHub / portfolio / LinkedIn / CV outputs
  -> WidgetForge visualizations
```

GitTeach should distinguish facts such as `this repository contains Rust`, interpretations such as `testing/verification is a recurring development tendency`, and self-reported context such as `I deliberately use AI agents and focus on review/debugging`.

## Product scope

GitTeach focuses on the developer rather than deeply modeling a codebase:

- technology footprint and how it changes over time;
- project/domain fingerprint: developer tools, games/mods, libraries, web, systems, AI tooling, etc.;
- project longevity, maintenance, releases and return-to-project behavior;
- testing, automation, documentation, observability and other recurring development tendencies;
- collaboration signals from PRs, reviews, issues and contributors when available;
- optional LinkedIn/user-declared career context;
- evidence-backed explanations for profile statements;
- personalized README/portfolio/CV/LinkedIn outputs;
- WidgetForge-compatible widgets, charts, cards and playful README visualizations.

Counts and model confidence are measurements, never expertise or seniority scores.

## Independent product boundary

The shipped GitTeach product is now **desktop-first and local-first**: Tauri 2 over the Rust core, connected to local Git repositories and GitHub without requiring a paid hosted analysis server. The verified F9 baseline currently uses a small vanilla HTML/CSS/JS webview; the planned UI modernization is **Svelte 5 + Vite** for a lighter, highly customizable presentation layer while Rust keeps repository analysis, durable state, privacy and publication authority. Existing repositories can be analyzed in place. Remote repositories normally keep only a blobless audit cache (commit/tree/path/blob identities); selected source blobs are hydrated transiently and discarded after analysis. App-local SQLite retains reconnectable audit identity, bounded sanitized repository/personal views, and direct private interview answers scoped to the exact personal profile. Publication/approval is deliberately locked during extended persistence testing; answering or restoring a declaration never grants consent. Restored views are last-known state and must be refreshed before treating repository contents as current. A future web companion may display/export produced profiles, but local analysis is the primary path.

It does **not** assume Bridge, MSSR, OmnySys or any specific coding-agent telemetry. OmnySys remains a separate codebase-understanding/governance product. GitTeach may eventually consume external evidence exports, but no such system is a runtime dependency.

See `docs/AI_ERA_PROFILE_MODEL.md` for the current product model.

## Jev and the conversational LLM

Jev is a bounded semantic judge, not the source of deterministic repository facts. GitTeach should not spend a Jev call to rediscover that a project contains TypeScript, Rust or Svelte. Jev is reserved for fuzzy questions such as whether automation/testing/maintenance/tool-building patterns recur across independent projects.

A separate conversational LLM can act as a **profile interviewer and synthesizer**: explain findings, identify gaps, ask the user about role/intent/AI usage, reconcile optional LinkedIn declarations with repository evidence and prepare user-controlled profile text. It does not code for the user.

The current core keeps TypeSafe/Jev behind an adapter so semantic-provider details never become the profile domain model.

## New core

The rebuild lives under `src/core/` plus the Rust `giteach-core` crate:

- `evidence/EvidenceLedger.js` — immutable, referenceable evidence records;
- `providers/CandidateEvidenceSelector.js` — deterministic candidate-specific evidence retrieval;
- `providers/JevSemanticProvider.js` / `TypeSafeJevAdapter.js` — bounded semantic-provider boundary with per-candidate provenance;
- `providers/IncrementalJevSemantics.js` / `JevObservationStore.js` — candidate-scoped Jev observations, exact input/evidence fingerprints, selective reuse/invalidation and portable JSON persistence without raw excerpts;
- `profile/ProfileAggregator.js` — `DeveloperProfile v1` cross-repository aggregation and explanations;
- `profile/ProfileDeclaration.js` / `ProfileReconciliation.js` / `ProfileInterviewPlan.js` — bounded self-report/profile-source declarations, reconciliation with observed evidence and deterministic interview questions; declarations stay private unless explicitly approved for publication;
- `profile/DevelopmentTendencies.js` — repeated deterministic repository-level tendencies, including testing, automation, observability and benchmarking, without expertise scoring;
- `profile/RepositoryDomainFingerprint.js` — explainable multi-label project-domain candidates from deterministic technology/language evidence plus optional declared GitHub Topics; empty results are valid and no winner/score is invented;
- `profile/RepositoryLifecycle.js` / `PortfolioLifecycle.js` — local Git lifecycle and portfolio-level delivery/maintenance facts;
- `github/GitHubRepositoryFacts.js` + `providers/GitHubRestFactsAdapter.js` — provider-neutral connected GitHub Release/PR/review/issue facts with stable provenance;
- `providers/GitHubRestClient.js` — read-only GitHub REST transport with serial requests, bounded pagination, conditional cache, timeout and rate-limit/backoff handling; authenticated cache is disabled unless the caller supplies a stable non-secret connection partition;
- `providers/GitHubRepositoryFactsCollector.js` — bounded repository collection; Releases/PRs/issues are collected directly while reviews are queried only for explicitly selected PR numbers to avoid N+1 request bursts;
- `github/GitHubCollaborationSummary.js` — shared JS/Rust cross-repository collaboration observations: observed activity counts, independent repository support, bounded fact refs and explicit partial/targeted coverage, never expertise/seniority/quality scores;
- `github/GitHubActorEvidence.js` — conservative GitHub fact → actor-evidence conversion (authored PR identity link; submitted review agency);
- `profile/ProfilePublicationContext.js` — explicit declaration publication firewall; private declarations never reach presentation payloads and approved ones expose only bounded public fields;
- `presentation/ProfileStatistics.js` — stable WidgetForge-facing statistics boundary with explicit units/coverage for technology, tendencies, domains, lifecycle and collaboration; no skill/seniority scores;
- `presentation/TechnologyEvolution.js` + Rust `technology_evolution` collector — bounded historical Git commit timelines built from real tree/blob metadata without checkout or interpolation; timeline values are repository composition, never skill progression;
- `presentation/ProfilePresentationPayload.js` / `ProfileWidgetPlan.js` — combine only the approved presentation planes and decide which semantic widgets exist without inventing missing data;
- `presentation/ProfileWidgetData.js` / `ProfileSurfaceComposition.js` — expose only each widget's referenced data slice and order widget ids for GitHub README/portfolio surfaces; HTML/SVG/theme rendering stays outside the GitTeach core;
- `documents/DocumentPreparation.js` — `DocumentInput v1` writing firewall;
- `documents/DocumentDraftRenderer.js` — conservative target-specific evidence-backed drafts;
- Rust `repository_audit` — remote audit acquisition without a persistent checkout: blobless current-tree cache, path/blob-OID snapshots, bounded target selection and transient selective blob hydration;
- Rust `repository_audit_store` — portable/reference longitudinal audit receipts containing commit/tree/path/blob identities only; no source bytes or cache-path persistence;
- Rust `product_store` — F9 SQLite product persistence. Repository connections/audit identity, sanitized repository/personal snapshots and exact-profile direct private interview declarations survive restart; raw hydrated source, consent metadata and approval state do not. Publication remains locked during extended testing;
- Rust `repository_workspace` — earlier clone-once worktree prototype retained as tested reference/fallback, not the normal remote-analysis path;
- `crates/giteach-core/` — Rust collector plus durable profile, lifecycle, audit-acquisition/history and document contracts.

Run the foundation tests with:

```bash
npm run test:core
```

The obsolete Electron/Designer/Triple-Server runtime has been removed from the active tree after migration classification. Historical material remains under `docs/archive/`, `docs/legacy/` and Git history; it is not current architecture. See `docs/MIGRATION_FROM_LEGACY.md`.
