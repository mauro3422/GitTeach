# Actor evidence quality and privacy

## Engineering quality evidence

GitTeach preserves concrete signals instead of emitting opaque developer-quality, expertise or seniority scores:

- tests/static checks added or passing;
- regressions reproduced and closed;
- before/after benchmark evidence;
- review/correction/retry cycles;
- migration compatibility gates;
- dependency/security remediation;
- repeated maintenance of the same subsystem over time;
- verified outcomes associated with attributable work.

Semantic interpretation may describe an engineering pattern supported by those facts, but must not turn them into unsupported evaluative labels or seniority percentages. Activity volume, repository count, LOC and provider confidence remain evidence/features rather than direct quality scores.

## Agent-workflow privacy rule

Agent receipts must be minimal and auditable: source reference, actor key, relation, repository, affected capability/evidence refs, timestamp, implementation origin and a bounded summary/hash where useful.

Raw private prompts, transcripts, credentials and hidden reasoning are excluded from normal profile evidence. A MauroPrime/Bridge/MSSR adapter may use observable lifecycle receipts such as user direction, corrections, verification requests and accepted outcomes, but must fail closed when actor identity, repository ownership or evidence attachment is ambiguous.

## Attribution boundary

- Repository ownership is never sufficient actor evidence.
- Git authorship remains `identity-linked` only.
- Stronger `agency-supported` status requires an observable agency relation from an independent source.
- Evidence belonging to one actor must never elevate another actor's profile.
