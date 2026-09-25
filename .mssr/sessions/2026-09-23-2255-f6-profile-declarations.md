# Session — F6 profile declarations and interview planning

**Date:** 2026-09-23 22:55 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** first F6 declaration/reconciliation/interview slice implemented and verified

## Objective

Start F6 without pretending that user answers or imported profile text are observed repository facts. Define a bounded declarative evidence contract, reconcile it against connected observations, and plan only useful profile-interview questions.

## Implemented

- Shared JS/Rust `giteach-profile-declaration-v1` for direct user answers and explicitly authorized profile imports.
- Profile imports require `authorizationRef`.
- Raw prompts, transcripts and credential-shaped fields are forbidden from declaration payloads.
- Publication is independently controlled: `publicationStatus` defaults to `private`; `approved` requires explicit user choice and does not alter declaration identity.
- Shared `giteach-profile-reconciliation-v1` preserves declared-supported / declared-not-observable / observed-undeclared / ambiguous.
- `declared-not-observable` means only that connected evidence does not currently corroborate the declaration; it never means false.
- Conflicting authorized declaration sources for the same key remain ambiguous; GitTeach does not silently choose a source winner.
- Added `development-tendency` as a declaration/interview category so automation/testing patterns are not mislabeled as generic skills.
- Shared `giteach-profile-interview-plan-v1` asks deterministic bounded questions for missing personal context, observed-but-undeclared patterns, declaration ambiguity and corroboratable unobserved capabilities/tendencies.
- Role, intent, career-context and AI-workflow declarations do not generate redundant “not observable in GitHub” questions.

## Verification

- JavaScript full suite: 157/157 PASS.
- Rust: 81 unit + 5 collector integration + 2 lifecycle integration = 88/88 PASS.
- `cargo fmt --check`: PASS.
- strict `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- `git diff --check`: PASS (Windows LF→CRLF warnings only).

## Product interpretation

The future conversational LLM should consume `ProfileInterviewPlan v1`; it may improve wording but must not invent questions/claims outside the bounded plan. User answers become `ProfileDeclaration v1`, not repository facts or ActorEvidence. Publication remains user-controlled.

No real LinkedIn/profile provider is connected in this slice. External profile sources remain future explicitly authorized adapters.

## Next

1. Adapt real GitTeach outputs (beginning with `DevelopmentTendencies`) into reconciliation observations.
2. Run a real profile/interview-plan canary from collected project evidence.
3. Add bounded user-facing question wording and answer-to-declaration conversion.
4. Keep private declarations out of publication surfaces until explicitly approved.

No commit or push was performed.