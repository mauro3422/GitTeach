# Experience attribution contracts

## Layer separation

- Repository facts are deterministic observations: languages, manifests, paths, hashes, tests, Git facts and measured verification results. They do not require Jev and are not personal skills by themselves.
- Jev observations are project-scoped semantic interpretations over explicit bounded candidates/evidence. Jev must not infer developer authorship, expertise or seniority.
- Personal experience exists only when project support is joined with actor evidence that links a configured actor to the work.

## Attribution states

- `repository-only`: project support exists but actor attribution does not.
- `identity-linked`: a configured identity is associated with the work (`authored-change`, `coauthored-change`), but manual implementation authorship is not established.
- `user-confirmed`: declared involvement; useful evidence but weaker than observable agency when both exist.
- `agency-supported`: observable direction, decision, review, debugging, testing, maintenance or similar agency.

Agency relations include `reviewed-change`, `decision-record`, `design-session`, `debug-session`, `test-session`, `maintenance-session` and `agent-direction`.

## Implementation origin

- Supported values: `human`, `ai-assisted`, `mixed`, `unknown`.
- AI assistance is provenance, not a negative score, and remains visible when known.
- Git authorship without stronger evidence defaults to origin `unknown`; it never silently means manually written code.

## ActorEvidence v1

- Shared contract: `giteach-actor-evidence-v1` in JavaScript and Rust.
- Records carry actor key, relation, repository, bounded source kind/ref, observation time, implementation origin and explicit attachment to capability keys and/or target evidence refs.
- Raw prompts/transcripts are not part of the contract.
- ActorEvidence can join `DeveloperProfile` only through an explicit subject actor key and exact capability/evidence attachment. The configured Git producer is the first verified source; evidence belonging to another actor cannot elevate the subject profile.

## Publication firewall

- Personal surfaces omit `repository-only` claims.
- Project surfaces may show repository-only facts/semantics with project-scoped wording.
- `identity-linked` may be described as contribution, never proof of manual authorship.
- `agency-supported` uses the specific supported action where possible: directed, decided/designed, reviewed, debugged, tested/validated or maintained.

## Evaluation rule

Do not emit opaque developer-quality, expertise or seniority scores. Preserve concrete evidence and outcomes instead; see `actor-evidence-sources.md` for quality signals and future evidence producers.
