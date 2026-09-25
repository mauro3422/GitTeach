# GitTeach Architecture

## Purpose

GitTeach builds a personalized, evidence-backed professional profile from repositories, GitHub activity and optional user-authorized profile sources. It is designed for a future where implementation may be largely AI-generated, so the product models observable project/work patterns rather than attempting to prove who typed each line.

### Responsibility split

| Component | Owns | Does not own |
|---|---|---|
| GitTeach core | deterministic facts, cross-project metrics, profile evidence, tendencies, provenance, document/widget data | deep codebase governance, coding for the user, opaque expertise scoring |
| Deterministic collectors | languages, manifests, activity, tests, CI, releases, docs, automation, Git/GitHub facts | semantic interpretation or personal-quality judgments |
| Jev | bounded interpretation of ambiguous project/cross-project patterns | facts already computable deterministically, developer authorship, expertise/seniority |
| Conversational LLM | profile interview, gap-filling questions, explanations, synthesis from curated evidence | coding, inventing experience, silently converting self-report into fact |
| WidgetForge | visual presentation of stable GitTeach statistics/tendencies | repository analysis or profile truth |

The shipped product is standalone. Bridge/MSSR/OmnySys may help development or act as optional external evidence sources, but GitTeach must remain fully functional without them.

## Local-first product runtime

The primary product target is a **desktop-first local application**. GitTeach should not require Mauro or another operator to fund a hosted analysis server just to inspect repositories or build a profile.

- The product shell is **Tauri 2 + a webview UI over the Rust core**. Rust owns deterministic acquisition/collection and durable local state; the webview owns interaction and presentation.
- Existing local repositories are analyzed directly in place.
- Remote repositories are **not cloned into a persistent working copy by default**. GitTeach keeps a small blobless bare audit cache containing the current commit/tree metadata and a path -> Git blob-OID inventory.
- Refresh starts with remote HEAD identity. When the commit changes, GitTeach fetches only a shallow `--filter=blob:none` tree snapshot, computes added/modified/deleted paths from blob OIDs, and selects a bounded set of files worth inspecting.
- Selected source blobs are hydrated in a **temporary** blobless Git store, hashed/analyzed in memory, and the temporary object store is deleted afterwards. The persistent audit cache is verified to remain missing those source blobs.
- Durable longitudinal state stores commit/tree IDs, path/blob OIDs, commit time and bounded derived/profile receipts—not a second permanent copy of the repository. F9 uses app-local `giteach-product.sqlite3`: F9.1 persists reconnectable repository/audit identity, F9.2a bounded repository inspection, F9.2b exact-profile personal inspection, and F9.3a direct private interview declarations for that exact profile. The older JSON audit-history adapter remains a portable/reference adapter, not the desktop product database.
- GitHub REST is reserved for account/repository metadata and connected facts that Git alone does not provide conveniently (Releases, PRs, reviews and issues). The existing `GitHubRestClient` remains responsible for serialized requests, bounded pagination, conditional HTTP cache, timeout and rate-limit/backoff.
- No GitHub access token is embedded in a clone/fetch URL. Authentication belongs to a secure credential/provider boundary.
- A future web companion may display/export already-produced profile data, but repository analysis is local by default; no hosted backend is required for the core user flow.
- F8's guided-profile desktop flow reuses the F6 contracts rather than inventing a second interview system: bounded personal observations -> reconciliation -> only unresolved prompts -> private declarations -> explicit per-declaration approval -> `ProfilePublicationContext v1`.
- The webview receives approved self-report separately from sanitized personal `DocumentInput` projections. Raw evidence objects, repository paths, source/excerpt hashes and internal authorization/source metadata stay behind the Rust boundary.
- `SqliteProductStore` schema v4 keeps versioned product persistence fail-closed. Repository connection identity is content-addressed from the reconnectable target; remote rows require a matching audit receipt; embedded HTTP credentials are rejected. Schema v1/v2/v3 migrates to v4 without dropping earlier repository/profile state.
- `giteach-repository-derived-snapshot-v1` stores only the safe repository-inspection subset already allowed across the webview boundary: analysis/coverage summary, languages/technologies, bounded `id/path/kind/bytes` evidence receipts and deterministic domain provenance. It deliberately excludes raw source/excerpts, arbitrary evidence metadata, source/excerpt/hydration hashes and cache/object-store paths. A changed persisted HEAD invalidates the snapshot.
- `giteach-personal-profile-derived-snapshot-v1` stores only the bounded attributable capabilities, repository evidence receipts, actor-evidence provenance and counts already allowed by `giteach-personal-profile-inspection-v1`. Its identity is the normalized exact actor matcher plus an order-independent unique repository-target set; plaintext matcher values are not stored as snapshot payload, duplicate targets fail closed, and unresolved or repository-only provenance cannot become persisted personal capability state.
- `list_repository_connections` exposes reconnectable targets; `load_repository_snapshot` restores repository-only inspection, `load_profile_snapshot` restores the exact personal inspection, and F9.3a save/load commands restore only direct private interview declarations under that exact profile. Publication/approval is hard-disabled in UI + JS policy + Tauri command during extended tests, and persistence rejects approved declarations. Restored state is continuity data, not freshness proof.
- WidgetForge stays downstream and optional until the product proves which visualizations are useful. F7's WidgetPlan/WidgetData/SurfaceComposition contracts remain its future integration boundary.

This recovers the useful product shape of legacy GitTeach (a local desktop app) without restoring the old Electron runtime or its REST-per-file repository scanner.

## Pipeline

```text
GitHub / Git / local repositories
  -> local repo in-place OR remote audit snapshot (commit/tree/path/blob OIDs)
  -> bounded target selection -> transient blob hydration -> deterministic collectors
  -> RepoEvidenceBundle + audit receipts + GitHub facts/statistics
  -> EvidenceLedger
       -> cross-project metrics/tendencies --------------------+
       -> bounded evidence -> Jev interpretation --------------+--> ProfileAggregator
                                                               |
Optional profile sources --------------------------------------+ 
  -> user answers / LinkedIn-like declarations / external evidence

ProfileAggregator
  -> DeveloperProfile v1
       -> technology footprint
       -> project/domain fingerprint
       -> development tendencies
       -> maintenance/delivery/collaboration history
       -> AI-workflow provenance when known
       -> confidence/provenance
  -> bounded personal profile + ActorEvidence
       -> F6 reconciliation -> unresolved interview prompts
       -> private ProfileDeclaration answers
       -> explicit declaration-id approval -> ProfilePublicationContext v1
  -> sanitized DocumentInput v1 observed-claim writing firewall
       -> GitHub README / portfolio / LinkedIn / CV prose renderers
  + ProfilePublicationContext v1 (explicitly approved declarations only)
  + ProfileStatistics v1 (explicit units + per-section coverage)
  + TechnologyEvolution v1 (real Git commit-tree history)
       -> ProfilePresentationPayload v1
       -> ProfileWidgetPlan v1
       -> ProfileWidgetData v1 (only the referenced source slice)
       -> ProfileSurfaceComposition v1 (GitHub README / portfolio widget-id order)
       -> WidgetForge visual renderer (outside GitTeach core)
```

The product should work without agent-session telemetry. If trustworthy agent/workflow receipts exist they are optional evidence, not a prerequisite. `DocumentInput v1` remains the writing firewall: downstream renderers see curated supported claims and bounded provenance, not raw repository dumps or the complete ledger.

Profile declarations are a separate authority plane. Shared JS/Rust `giteach-profile-declaration-v1` stores bounded direct answers or explicitly authorized profile imports without promoting them to observed facts. `giteach-profile-reconciliation-v1` compares declarations with connected observations while preserving `declared-not-observable` as distinct from false and keeping conflicting sources ambiguous. `giteach-profile-interview-plan-v1` turns only real gaps/ambiguities into deterministic questions. Publication consent is separate from declaration identity: declarations default to `private` and become publishable only when explicitly marked `approved`.

## Evidence contract

Each evidence record has a durable id derived from repository/path/kind/subject plus source identifiers. A record may reference a commit, source hash, excerpt hash, observed time and metadata.

The ledger is append-oriented. A semantic observation refers to evidence ids instead of copying untraceable conclusions.

The current Rust repository collector creates bounded evidence for source files, tests, documentation, tooling and dependency/runtime manifests while retaining repository/Git identity, hashes, language totals and recency. Source sampling preserves language diversity before filling the remaining bounded budget, so a mixed repository cannot hide an entire language merely because another source tree appears first in walk order. Profile signals such as observability and benchmarking use a separate bounded preservation path, so their evidence does not disappear merely because generic source sampling chose other representative files.
Current technology presentation has two distinct deterministic layers. `giteach-technology-footprint-v1` summarizes current connected-repository language/technology prevalence and observed file/byte volume. `giteach-technology-evolution-v1` reads bounded historical Git commit trees without checkout and records actual per-snapshot language file/byte composition. Historical sampling keeps explicit coverage (`commitCount`, `snapshotCount`, `completeHistory`) and never interpolates missing commits or turns repository composition into developer-skill progression.

Shared JS/Rust `giteach-repository-domain-fingerprint-v1` derives zero or more explainable project-domain candidates from deterministic technology/language evidence plus optional GitHub Topics. Candidates are multi-label and rule-based; no winner, confidence, seniority or expertise score is emitted. Topics remain repository-declared metadata, and per-candidate provenance is bounded. An empty fingerprint is a valid abstention boundary for later declarative or bounded semantic interpretation.

Deterministic lifecycle analysis is a separate layer from file evidence. Shared JS/Rust `giteach-repository-lifecycle-v1` records local commit-history span, active calendar months/years, tags reachable from current `HEAD` and commits after the latest reachable tag. Shared `giteach-portfolio-lifecycle-v1` aggregates those facts once per repository. Local Git tags are not GitHub Releases, and lifecycle counts never become quality/expertise scores.

Connected GitHub facts are now a verified separate layer. Shared JS/Rust `giteach-github-repository-facts-v1` models Releases, PRs, submitted reviews and true issues with stable ledger refs; the REST adapter filters PR-shaped Issues records to avoid double-counting. Authored PRs may become identity-linked `authored-change`, while a submitted review may become `reviewed-change` agency. Pending reviews, Releases and issues remain facts and cannot fabricate engineering agency. Future transport may use REST or GraphQL without changing this domain contract.

`GitHubRestClient` is transport-only infrastructure: it serializes reads, follows GitHub `Link` pagination within explicit page/item budgets, uses conditional requests, sanitizes auth/network errors, tracks `x-ratelimit-*`/`retry-after`, enforces local backoff and timeouts, and rejects cross-origin pagination targets before credentials can be sent. Authenticated responses are not cached unless the caller supplies a stable non-secret connection partition; public cache keys remain URL-compatible. `GitHubRepositoryFactsCollector` queries Releases/PRs/issues directly but reviews only for explicitly selected pull numbers, keeping partial coverage visible instead of creating an unbounded N+1 scan.

Shared JS/Rust `giteach-github-collaboration-summary-v1` aggregates only already-collected `GitHubRepositoryFacts` plus explicit collection coverage. It deduplicates repositories, requires one connected login, reports observed activity counts and supporting repository counts separately, bounds retained fact refs, and preserves partial base/review coverage. Review coverage is always `targeted`; even zero omitted PRs means only the requested PR set was covered, never complete account review history. A `PENDING` review remains a GitHub fact but is not counted as submitted activity until it has actually been submitted.

Repository facts are not personal skills. Languages, manifests and exact Git/file measurements remain deterministic facts; Jev only adds bounded project semantics, and neither layer becomes personal experience until actor attribution supports it.

## Semantic observation contract

A Jev observation is explicitly project-scoped. The legacy `skill` field remains a compatibility label for the candidate, but it does not mean “the developer has this skill”:

```json
{
  "provider": "jev",
  "skill": "selective invalidation",
  "scope": "project",
  "claimType": "semantic-observation",
  "confidence": 0.93,
  "reason": "...",
  "evidenceRefs": ["..."],
  "repository": "giteach"
}
```

GitTeach rejects profile aggregation when an observation references evidence that does not exist. This makes provenance a structural constraint rather than a prompt instruction.

Before Jev, `CandidateEvidenceSelector` may narrow the bounded bundle deterministically for explicit semantic candidates. The selector is retrieval, not truth: candidate-specific refs must remain inside the final request bundle, a no-match candidate receives no fabricated fallback evidence, and TypeSafe cannot publish an accepted claim for a candidate with zero explicit refs. Deterministic facts such as Rust/TypeScript/Svelte presence should come directly from `RepoEvidenceBundle v1` rather than consume a Jev question.
Incremental Jev work is candidate-scoped. `giteach-jev-observation-v1` persists the bounded contract identity, question/context/provider-policy identity, exact evidence refs plus hashes/digests of what the model saw, provider/model metadata and supported/abstained outcome. It deliberately does **not** persist raw evidence excerpts or prompts. `giteach-incremental-jev-plan-v1` reuses an observation only when the candidate input fingerprint still matches; unrelated evidence outside that candidate slice does not invalidate it, while evidence/question/context/provider-policy changes refresh only affected candidates. Candidates with zero explicit evidence are skipped without a provider call.

`JevObservationStore` is a local JSON adapter for CLI/dev and proves persistence across separate executions; it is not the product database contract. The same observation/store schemas are serialized by JS and Rust so a future SQLite/IndexedDB adapter can replace JSON without changing semantic truth. Floating provider aliases must use a bounded `maxObservationAgeMs` policy; exact input identity alone is not permission to reuse a semantic observation indefinitely. Provider policy identity includes the TypeSafe decision contract, requested model and acceptance threshold.

## Profile contract

`DeveloperProfile` is a derived view, not a replacement for the ledger. Capability entries keep:

- the human-readable project capability/semantic label;
- repositories and evidence that support it;
- the original semantic observations;
- attribution status plus actor evidence refs/relations and implementation origin;
- support count and provider confidence as metadata, not as an expertise score.

Attribution is fail-closed. `repository-only` means the project supports the statement but no person is established. `identity-linked` means a configured actor identity is associated with the work but does not prove manual authorship. `agency-supported` requires observable direction, decision, review, debug, test or maintenance evidence. `user-confirmed` remains a declared signal and does not override stronger observable agency.

GitTeach must not infer seniority from repository count, language count, cyclomatic complexity, activity volume or model confidence. It also must not infer manual authorship from Git author metadata alone. See `docs/EXPERIENCE_ATTRIBUTION.md`.

## Document preparation contract

`giteach-document-input-v1` is the only normal downstream writing boundary. It resolves every supporting evidence ref and exposes curated project support plus explicit attribution. Full excerpts, arbitrary evidence metadata, raw repository dumps and the complete ledger stay upstream.

Personal targets (GitHub profile, portfolio, LinkedIn and CV) fail closed on `repository-only` claims. Project README summaries may retain them, but the renderer must say that the observation belongs to the project and is not attributed to the developer. `identity-linked` output uses contribution wording and carries a caution that Git association does not prove manual authorship. AI-assisted/mixed implementation origin remains visible when known.

A later System-2 writer may improve prose, but it cannot promote project-only evidence to personal experience or invent actor relations absent from `DocumentInput v1`.

## Query model

A profile query such as `why do you say I have experience with X?` resolves in this order:

```text
experience/capability key
  -> project facts and/or project semantic observations
  -> actor attribution status + actor evidence refs
  -> supporting evidenceRefs
  -> concrete repository/path/commit/session evidence
```

The answer must be able to distinguish “this repo contains X”, “this project does X”, and “the developer demonstrably acted around X”. The same curated bundle can later be given to a writing model so generated prose remains auditable.

## Extension boundary

Future sources can implement a common collector interface:

- GitHub API / local Git repository;
- plain filesystem repository;
- optional OmnySys export;
- future non-code systems.

Source adapters produce evidence only. They do not directly mutate professional claims. That keeps GitTeach extensible beyond programming later without changing the evidence/profile core.
