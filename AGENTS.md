# GitTeach Agent Rules

## Source of truth

New development belongs in `src/core/`. Treat legacy `src/main` and `src/renderer` as read-only migration references unless a task explicitly targets migration.

## Required invariants

1. Never publish a professional claim without evidence refs that resolve in `EvidenceLedger`.
2. Never infer seniority or expertise from raw counts alone.
3. Keep Jev semantic output advisory and provenance-bound.
4. Keep provider/network details outside the domain model.
5. GitTeach must run without OmnySys.
6. An optional OmnySys integration may only act as an evidence-source adapter.
7. Generated GitHub/LinkedIn/CV prose must be downstream of the curated profile, never direct from raw repository dumps.

## Validation

Run `npm run test:core` after changing `src/core/`.

Before removing legacy code, document whether each module is migrated, reference-only, or deleted and verify no `src/core/` import points into legacy runtime code.
