# Evidence, semantic and profile contracts

## Provenance bridge

- F1 Rust→JS import preserves `RepoEvidenceBundle` evidence IDs as `EvidenceLedger` IDs. It does not mint semantic identities or reinterpret deterministic evidence.
- Collector `head_commit_time` is the deterministic imported `observedAt` when available; source/excerpt hashes remain provenance fields.
- Bounded source evidence must preserve useful language diversity without increasing its configured budget; repository totals remain independent from sampled evidence counts.
- Source sampling reserves representation for observed source languages before filling remaining source-evidence capacity; `.svelte` files are first-class Svelte source evidence.

## Jev / TypeSafe boundary

- F2 uses provider-neutral `giteach-jev-bounded-v1` before the TypeSafe adapter. Explicit abstention is valid and evidence refs outside the bounded request are rejected.
- Provider/model/response metadata may be retained on semantic observations; network/SDK mechanics stay in adapters and outside the evidence/profile domain model.
- The global `typesafe-ai` skill and current live TypeSafe docs are the provider-contract authority.
- Jev uses structured decision primitives such as Noul. GitTeach supplies explicit capability candidates rather than asking Jev to invent free-form skill labels.
- The TypeSafe adapter asks one Noul question per explicit capability candidate. Application code owns the acceptance threshold.
- Candidate-specific evidence refs are allowed only when they are within the final bounded request and attached to the supplied candidate. Accepted claims preserve that narrower provenance set.
- The deterministic candidate evidence selector is an optimization/retrieval step, not semantic truth. No-match candidates receive no fabricated fallback evidence.
- Candidate refs are intersected with the globally selected evidence set before a Jev request is built. An explicitly empty candidate-specific ref set cannot produce an accepted claim.
- Live canaries record model, usage, probabilities and latency but never credentials. Credential source is Windows Credential Manager target `TypeSafe:MSSR:JevLab`; retrieve/inject ephemerally and never persist the secret.
- The initial F2 canary passed against `jev-1.13.0`: JavaScript programming 0.91 vs Kubernetes cluster administration 0.02; 625 input / 40 output tokens; 530 ms.

## DeveloperProfile v1

- F3 `giteach-developer-profile-v1` is a shared JS/Rust contract.
- It tracks independent supporting repositories, evidence diversity, latest evidence observation, explicit stale evidence and provenance-bearing contradictions.
- Repository/evidence frequency or model confidence must not be converted into expertise scores or seniority labels.
- Missing evidence refs fail closed.

## DocumentInput v1 / F4

- `giteach-document-input-v1` is the normal boundary for professional writing/rendering.
- It contains curated supported claims, bounded provenance summaries and stale/contradiction cautions.
- Raw repository dumps, full excerpts, arbitrary evidence metadata and the complete ledger remain upstream.
- Document preparation fails closed when a supporting evidence ref does not resolve.
- A deterministic renderer or later writing model may rephrase/format supported claims but may not mint a capability absent from `DocumentInput v1`.
- F4 is closed only because every supported target value renders from this same boundary; no target has a raw-repository bypass.
