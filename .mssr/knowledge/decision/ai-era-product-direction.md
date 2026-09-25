# AI-era product direction

## Product boundary

- GitTeach ships as a standalone app/web connected primarily to GitHub/Git plus optional user-authorized profile sources.
- Bridge, MSSR, OmnySys and coding-agent telemetry are optional enrichment only, never runtime requirements.
- Manual line authorship is not the center of the product. Profile the repeated work a person builds, maintains, verifies, automates, reviews and ships.

## Profile model

- Deterministic facts/statistics come first: technologies, tests, CI, docs, automation, lifecycle, collaboration and project/domain signals.
- Repository domains are explainable multi-label candidates. Deterministic technology/language evidence and optional declared GitHub Topics are sources; there is no winner/confidence score. Empty deterministic results are valid.
- Cross-project tendencies describe repeated automation, testing/verification, tooling, documentation, observability, benchmarking, maintenance and delivery patterns.
- Jev is reserved for bounded ambiguous questions; it must not rediscover deterministic facts or emit expertise/seniority scores.
- A conversational LLM is a profile interviewer/synthesizer, not a coder. User answers and optional profile imports remain declarative evidence; `not observable` is not `false`.
- Personal action claims such as `designed`, `reviewed` or `debugged` still require actor/self-report evidence.

## AI-era interpretation

- AI-assisted/mixed implementation origin is provenance, never a negative signal or guessed `percent human code`.
- Tests/regressions, automation, CI, migrations, benchmarks, releases/maintenance, docs/changelogs and collaboration can describe how work is carried forward; they do not prove AI use or manual authorship.

## Presentation

- WidgetForge consumes stable GitTeach statistics/tendencies; it does not redefine profile truth.
- Visual values represent observed facts/prevalence, not skill level.

Canonical detail: `docs/AI_ERA_PROFILE_MODEL.md`. Verified signal/domain implementation: `.mssr/knowledge/state/profile-signals-domain.md`.
