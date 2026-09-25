# Session — F5 experience attribution boundary

**Date:** 2026-09-23 14:55 -03:00  
**Branch:** `rebuild/evidence-profile-core`  
**Trace:** `mssr-20260923171840-ac282c12-eda`

## Goal

Resolve whether Jev was merely rediscovering language facts and redesign GitTeach so an AI-assisted codebase can support an honest professional profile without equating repository contents, Git authorship or generated code with developer experience.

## Initial state / question

- F0-F4 were closed and F5 incremental reuse/invalidation had begun.
- The collector already knew deterministic language/file/manifest facts.
- Earlier Jev calibration queries included language candidates such as TypeScript, Rust and Svelte.
- That made an important ambiguity visible: repository language presence is deterministic and should not itself become a semantic or personal skill claim.
- In AI-heavy projects, Git authorship also does not prove that a person manually wrote the implementation.

## Durable decisions

1. Separate repository facts, project semantics and personal experience.
2. Deterministic language/manifest/Git facts come from the collector; they do not need Jev.
3. Jev judges project-scoped semantic candidates only and must not infer developer authorship, expertise or seniority.
4. Personal experience requires actor evidence in addition to project support.
5. Attribution states are `repository-only`, `identity-linked`, `user-confirmed`, `agency-supported`.
6. Git authored/coauthored work is identity linkage only; it does not prove manual implementation authorship.
7. Observable agency includes direction, decisions/design, review, debugging, testing/validation and maintenance.
8. AI-assisted/mixed implementation origin remains explicit provenance and is not a negative score.
9. Observable agency outranks self-confirmation when both exist.
10. Engineering quality is represented through concrete gates/outcomes, not a hidden quality or seniority score.

## Implementation

### Attribution policy

- Added `src/core/profile/AttributionPolicy.js`.
- Added JS/Rust attribution states and actor relations.
- `DeveloperProfile v1` capability entries now carry attribution metadata.
- Supporting evidence only contributes to attribution.

### Jev semantic boundary

- `JevSemanticProvider.inferProjectSemantics()` is now the primary API.
- Jev requests explicitly prohibit developer authorship/expertise/seniority inference.
- Output observations declare `scope: project` and `claimType: semantic-observation`.
- `inferSkills()` remains a compatibility alias only.

### Publication firewall

- `DocumentInput v1` now carries attribution and bounded actor provenance.
- Personal targets omit `repository-only` claims.
- Project README summaries may keep repository-only observations with explicit project-only wording.
- `identity-linked` output warns that Git association does not prove manual authorship.
- Agency-supported rendering uses evidence-specific verbs such as directed, decided, reviewed, debugged, tested or maintained.
- AI-assisted/mixed provenance remains visible when known.

### ActorEvidence v1

- Added shared `giteach-actor-evidence-v1` contract in JS and Rust.
- Sources may be Git, GitHub, design artifacts, work sessions, agent workflows or manual declarations.
- Every actor record must attach to capability keys and/or exact target evidence refs.
- Raw prompt/transcript fields are deliberately outside the contract.
- Current contract is validated but intentionally not auto-joined into `DeveloperProfile`; producer trust/attachment rules come first.

### Documentation

- Added `docs/EXPERIENCE_ATTRIBUTION.md`.
- Updated `ARCHITECTURE.md` and `ROADMAP.md` around the facts → semantics → actor evidence → personal experience pipeline.
- Added `.mssr/knowledge/decision/experience-attribution-contracts.md` and registered it in modular project context.

## Files touched in this slice

- `src/core/profile/AttributionPolicy.js`
- `src/core/profile/ActorEvidence.js`
- `src/core/profile/ProfileAggregator.js`
- `src/core/providers/JevSemanticProvider.js`
- `src/core/documents/DocumentPreparation.js`
- `src/core/documents/DocumentDraftRenderer.js`
- `src/core/index.js`
- `crates/giteach-core/src/profile.rs`
- `crates/giteach-core/src/actor.rs`
- `crates/giteach-core/src/document.rs`
- `crates/giteach-core/src/incremental.rs`
- `crates/giteach-core/src/lib.rs`
- `tests/core/attribution-policy.test.js`
- `tests/core/actor-evidence.test.js`
- `tests/core/document-preparation.test.js`
- `tests/core/profile-evidence.test.js`
- shared schema fixtures
- `docs/EXPERIENCE_ATTRIBUTION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- durable `.mssr` context/state/memory modules

## Verification

- `npm run test:core`: 52/52 PASS.
- Rust: 19 unit + 4 integration = 23/23 PASS.
- `cargo fmt --check`: PASS.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- ActorEvidence/DeveloperProfile/DocumentInput/IncrementalProfilePlan fixtures: valid.
- `git diff --check`: PASS; only existing LF→CRLF warnings.

## Limitations / blockers

- No real actor producer is joined yet. Existing repositories therefore must not be retroactively attributed to the developer merely because they are owned by or committed under a familiar identity.
- `ActorEvidence v1` exists as a safe contract but remains separate from `ProfileAggregator` until producer/attachment behavior is verified.
- Earlier Jev language canaries remain historical calibration only; future normal operation should use deterministic language facts instead.

## Exact next step

1. Implement a configured Git identity adapter that produces `identity-linked` ActorEvidence only.
2. Implement a privacy-bounded MauroPrime/Bridge/MSSR receipt adapter for observable user direction/corrections/verification/accepted outcomes.
3. Join ActorEvidence into DeveloperProfile through exact capability/evidence attachment, fail closed on ambiguity.
4. Then resume F5 semantic observation caching and two-snapshot selective invalidation canary.

No commit or push requested.


## Context maintenance closeout

- The first attribution memory module reached 90% of its configured context budget during postflight review.
- Split durable knowledge into `experience-attribution-contracts.md` (authority/publication rules) and `actor-evidence-sources.md` (producer/privacy/quality rules).
- Both modules are registered separately in `.mssr/project-context.json`; this preserves selective loading instead of growing another monolithic memory file.
