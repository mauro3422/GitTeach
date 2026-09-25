# Profile declarations, interview and publication

## Verified F6 boundary

- `giteach-profile-declaration-v1` is actor-scoped declarative evidence for direct user answers or explicitly authorized profile imports; raw prompts, transcripts and credentials are forbidden.
- `profile-import` requires `authorizationRef`; concrete network/profile providers are optional future adapters.
- Reconciliation preserves `declared-supported`, `declared-not-observable`, `observed-undeclared` and `ambiguous`; absence is not false and source conflicts get no silent winner.
- Real `DeveloperProfile` / `DevelopmentTendencies` outputs feed reconciliation through bounded JS/Rust observation adapters.
- `giteach-profile-interview-plan-v1` plus JS/Rust interview adapters render bounded questions and convert answers back to `ProfileDeclaration v1`; answers are private by default.
- Real GitTeach+Kode rescan canary observed automation + documentation in 2/2 repos and generated evidence-backed `confirm-observed-pattern` questions.
- Shared JS/Rust `giteach-profile-publication-context-v1` is the publication firewall: only explicit `approved` declarations for the subject actor pass. Public declaration payloads omit authorization refs, source hashes, source refs and publication metadata.

## Verification

- JS 173/173 PASS.
- Rust 91 unit + 5 collector + 2 lifecycle = 98/98 PASS.
- fmt-check, strict Clippy and `git diff --check`: PASS.

## F8 desktop adoption

- `prepare_profile_interview` reuses the F6 observation/reconciliation/planning path against the bounded actor-linked personal profile and emits `giteach-profile-interview-session-v1`; every prompt evidence ref must resolve inside the returned bounded repository/actor evidence session.
- `answer_profile_interview` always stores the answer as private `ProfileDeclaration v1`. Answering never grants publication consent.
- `generate_profile_outputs` accepts explicit declaration ids as the only publication approval authority, forces every non-approved declaration back to private, then builds `ProfilePublicationContext v1` and five sanitized personal `DocumentInput` targets.
- The webview never receives raw document evidence objects, repository paths, source/excerpt hashes or internal authorization/source metadata through this output boundary.
- F8 close verification: JavaScript 228/228 PASS; Rust 141/141 PASS; focused desktop view-model 15/15 PASS; fmt-check, strict Clippy, Node syntax and `git diff --check` PASS.

## Next

F8 is closed. F9 persists private declarations/publication consent and related product state in SQLite without weakening these privacy/publication boundaries. F7 presentation/WidgetForge contracts remain separate and stable.
