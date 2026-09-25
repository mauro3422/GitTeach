# Session — AI-era product reframe

**Date:** 2026-09-23 16:15 ART  
**Branch:** `rebuild/evidence-profile-core`  
**Status:** product direction/documentation reconciled; no production-code change

## Why this session happened

The previous F5 direction was starting to over-focus GitTeach on proving actor agency through Git/agent receipts. That risked making the product dependent on telemetry ordinary users will not have and made GitTeach feel too close to a code-semantics/OmnySys problem.

The product question was reframed around a future where AI may write much of the code:

> What can connected repositories and authorized profile sources demonstrate about what kind of developer this person is, what they repeatedly build, how they carry projects forward and how they want that identity presented?

## Durable decisions

- Manual line authorship is not the product center.
- GitTeach ships as a standalone GitHub/Git-connected app/web; it does not require Bridge, MSSR, OmnySys or coding-agent logs.
- Deterministic facts/statistics should be maximized before semantic calls: technologies, activity, tests, CI, releases, docs, automation, maintenance, PR/review/issue signals and project types.
- The personal differentiator is cross-project `development tendencies`: automation, testing/verification, tooling, documentation, observability, maintenance, experimentation, delivery and recurring domains.
- Jev is reserved for ambiguous bounded pattern/project questions; it must not rediscover basic languages/frameworks or produce expertise/seniority scores.
- A conversational LLM is a profile interviewer/synthesizer, not a coder. It asks targeted questions where repositories cannot resolve role, intent, AI usage or career context.
- User answers and optional LinkedIn-like imports remain self-reported/declarative evidence and are reconciled rather than treated as ground truth.
- `Not observable in connected repositories` never means `false`.
- Specific action claims (`designed`, `reviewed`, `debugged`, etc.) still need corresponding actor/self-report evidence, but personal README/profile statistics may describe repeated patterns across the user's connected projects without pretending manual authorship.
- WidgetForge becomes a first-class presentation boundary. It consumes stable GitTeach statistics/tendencies and does not re-analyze repositories.

## New profile model

The intended profile contains separate views:

1. technology footprint;
2. project/domain fingerprint;
3. development tendencies;
4. delivery/maintenance history;
5. collaboration footprint;
6. AI workflow provenance when known;
7. evidence/confidence classification.

No synthetic `developer score`, `Rust 87%`, seniority inference or guessed `percent human-written code`.

## AI-era / supervisory signals without agent logs

Useful observable proxies include feature→test/regression patterns, bug-fix/revert/rework loops, CI gate adoption, migration+compatibility work, benchmark cycles, release→maintenance behavior, automation replacing manual work, docs/changelog/ADR habits, long-running maintenance, review/issue participation and recurring project types.

These signals describe how work is carried forward. They do not prove AI usage or manual authorship.

## Documentation changed

- new `docs/AI_ERA_PROFILE_MODEL.md`;
- `README.md` product scope/pipeline/Jev+LLM boundary;
- `ARCHITECTURE.md` standalone product responsibility split and profile pipeline;
- `ROADMAP.md` F5 reprioritization + F6 interviewer/profile sources + F7 WidgetForge + F8 optional external adapters;
- `docs/EXPERIENCE_ATTRIBUTION.md` standalone/no-agent-telemetry inference model;
- `.mssr/PROJECT_CONTEXT.md`, `PROJECT_MEMORY.md`, `PROJECT_STATE.md`, current phase and handoff;
- active changelog milestone.

## Next product work

1. Expand deterministic GitHub/repository metrics.
2. Build first deterministic cross-project `development tendencies` aggregation.
3. Use/cached Jev only for ambiguous candidates.
4. Add conversational profile interviewer and optional LinkedIn-like declarations.
5. Expose stable WidgetForge-facing profile statistics.

Bridge/MSSR/agent receipts remain optional future enrichment.

No commit or push was performed.

## Postflight

- Moved the standalone/AI-era direction into selective module `.mssr/knowledge/decision/ai-era-product-direction.md` instead of growing `PROJECT_MEMORY`.
- Compacted actor-source and handoff modules; final `project_context_load` reports `projectContextHealth: ok`, 12 modules, no findings.
- `project-context.json` parses successfully; `git diff --check` PASS; current non-session docs contain no stale instruction to prioritize a Bridge/MSSR actor adapter.
- Production code was not changed in this reframe, so the previously verified JS 54/54 + Rust 28/28 code baseline remains the applicable code gate.