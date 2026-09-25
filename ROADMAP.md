# GitTeach Roadmap

## Current line — AI-era developer profiles

GitTeach is being rebuilt around a small domain core that profiles **the person across projects**, not around proving manual code authorship or deeply understanding every symbol in a codebase. The standalone product should connect to GitHub/Git plus optional user-authorized profile sources, remain useful when AI writes most implementation code, and feed personalized documents/widgets from auditable statistics and tendencies.

See `docs/AI_ERA_PROFILE_MODEL.md` for the current product thesis.

### F0 — responsibility split and evidence contract — DONE

- GitTeach and OmnySys responsibilities separated.
- OmnySys made optional, never required.
- Legacy README archived.
- `EvidenceLedger` created with stable evidence references.
- Jev isolated behind a provider adapter.
- Cross-repository profile aggregation preserves evidence lineage.
- `why does the system think I know X?` path covered by tests.

### F1 — repository evidence collector — DONE

Build a deterministic collector for a local/GitHub repository:

- repository identity and current commit;
- language/manifest signals;
- bounded source/doc/test snippets;
- Git recency/history evidence;
- file and excerpt hashes;
- ignore generated/vendor/secrets by policy.

Output: `RepoEvidenceBundle v1`, deterministically bridged into `EvidenceLedger` with collector IDs and provenance preserved.
### F2 — real Jev adapter — DONE

Wire `JevSemanticProvider` to TypeSafe `systemOne` using bounded evidence bundles. Preserve full response metadata, provider/model version, confidence/distribution where available, and evidence refs. No broad "classify everything" pass by default.

### F3 — cross-repository profile — DONE

Aggregate repeated capabilities without turning frequency into an expertise score. Track recency, independent repositories, evidence diversity, contradictions and stale claims.

Output: `DeveloperProfile v1`.

### F4 — document preparation — DONE

Generate evidence-backed drafts for:

- GitHub profile README;
- per-project README summaries;
- portfolio project cards;
- LinkedIn project/skills text;
- CV evidence bundles.

The writing model receives curated claims + references, not raw repository dumps.

### F5 — incremental profile + AI-era evidence — DONE

F5 keeps semantic work incremental while refining what GitTeach can responsibly say about a person in an AI-assisted workflow.

- Incremental slice implemented: shared JS/Rust `IncrementalProfilePlan v1` classifies prior capabilities as reusable or invalidated from current evidence identity.
- Attribution slice implemented: `repository-only`, `identity-linked`, `agency-supported` and `user-confirmed` are distinct; personal document targets omit repository-only claims.
- Git-authored/coauthored changes are identity links only and never imply manual implementation authorship.
- Jev is project/cross-project semantic only; deterministic language/framework/GitHub facts come directly from collectors.
- AI-assisted/mixed implementation origin is retained as provenance rather than hidden or treated as a negative score.
- Incremental Jev persistence is implemented: `giteach-jev-observation-v1` + `giteach-incremental-jev-plan-v1` isolate one candidate per semantic state, fingerprint exact evidence/question/context/provider policy, reuse unchanged observations and refresh only invalidated slices. JS/Rust share the persistence schema; local JSON stores prove cross-process reuse without raw excerpts. Floating provider aliases can be bounded by `maxObservationAgeMs` instead of being reused indefinitely.
- First deterministic cross-project tendency slice implemented as shared JS/Rust `giteach-development-tendencies-v1`: testing/verification, automation, documentation, tooling/configuration and CI/delivery. A repository contributes at most one prevalence unit, at least two independent repositories are required, and provenance keeps one representative evidence ref per supporting repository.
- Repository lifecycle slice implemented as shared JS/Rust `giteach-repository-lifecycle-v1`: first/latest commit, active month/year counts, reachable local Git tags and commits after the latest reachable tag. These are measurements, never skill/quality scores; local tags are explicitly distinct from GitHub Releases.
- Portfolio lifecycle slice implemented as shared JS/Rust `giteach-portfolio-lifecycle-v1`: repositories with history, multi-month history, reachable tags and post-tag work are aggregated once per independent repository.
- Connected GitHub facts slice implemented as shared JS/Rust `giteach-github-repository-facts-v1`: Releases, PRs, reviews and true issues remain distinct deterministic facts with stable EvidenceLedger refs. Authored PRs may produce identity-linked `authored-change`; only submitted reviews produce `reviewed-change` agency; pending reviews/releases/issues do not fabricate engineering agency. Public REST canary passed on `AllTheMods/All-the-mods-10-Sky#821`.
- Bounded GitHub REST transport implemented: serial read queue, Link-header pagination, ETag/Last-Modified conditionals, timeout, sanitized auth/network errors, rate-limit/backoff state, cross-origin rejection and authenticated cache partitioning. `GitHubRepositoryFactsCollector` keeps releases/PRs/issues bounded and queries reviews only for selected PR numbers, with partial coverage explicit.
- Cross-repository GitHub collaboration summary implemented as shared JS/Rust `giteach-github-collaboration-summary-v1`: observed release/PR/merged-PR/submitted-review/issue activity, repository support counts, bounded fact refs and explicit base/review coverage. Duplicate repositories cannot inflate counts; `PENDING` reviews remain facts but are excluded from submitted activity; review history is never labeled complete from targeted queries.
- Deterministic profile-signals slice implemented: `giteach-development-tendencies-v1` now includes observability and benchmarking, and the Rust collector preserves bounded profile-signal evidence independently from generic source sampling.
- Project/domain slice implemented as shared JS/Rust `giteach-repository-domain-fingerprint-v1`: multi-label candidates come from explainable technologies/languages plus optional declared GitHub Topics, with bounded provenance and no winner/confidence/expertise score. Empty deterministic fingerprints are valid.
- Real selective-reuse canaries passed on Kode: first semantic pass called TypeSafe only for Rust/Monaco while Kubernetes skipped; exact second pass reused both with 0 provider calls; a Rust-only evidence-content change refreshed only Rust. Cross-process JSON persistence also proved that exact reuse works with no credential/network access. F5 is closed; next product-facing work is F6 profile declarations + conversational interviewer.

### F6 — profile sources + conversational interviewer — DONE

- Shared JS/Rust `giteach-profile-declaration-v1`, `giteach-profile-reconciliation-v1` and `giteach-profile-interview-plan-v1` keep self-report/profile imports separate from observed repository/GitHub facts and ActorEvidence.
- `profile-import` requires explicit authorization; publication is independently opt-in (`private` by default, `approved` only by explicit user choice).
- Real `DeveloperProfile` / `DevelopmentTendencies` outputs feed reconciliation through bounded observation adapters; cross-project patterns remain `development-tendency`, not generic skills.
- Bounded interview wording and answer conversion are implemented in JS/Rust. Answers become private `ProfileDeclaration v1`, never repository facts or ActorEvidence.
- Real GitTeach + Kode canary: automation and documentation were observed in 2/2 repositories and produced evidence-backed `confirm-observed-pattern` interview questions.
- Shared JS/Rust `giteach-profile-publication-context-v1` is the declaration publication firewall: private declarations and other actors are excluded; approved declarations expose only bounded public fields and omit consent/internal provenance metadata.
- Concrete LinkedIn-like/network providers are intentionally deferred to F8; F6 owns the provider-neutral declaration/interview/publication contracts.

### F7 — personalized presentation + WidgetForge — DONE

- Shared JS/Rust `giteach-profile-statistics-v1`, `giteach-technology-footprint-v1` and `giteach-technology-evolution-v1` provide deterministic current/historical presentation data with explicit units/coverage and no skill/seniority scores.
- Shared JS/Rust `giteach-profile-presentation-v1` composes statistics, per-repository historical timelines and explicitly approved F6 publication context without merging their meaning.
- Shared JS/Rust `giteach-profile-widget-plan-v1` decides which semantic widgets exist; missing/empty data produces no fabricated widget and targeted collaboration requires explicit coverage.
- Shared JS/Rust `giteach-profile-widget-data-v1` resolves each widget to only its referenced source plane/section/repository, so WidgetForge never receives the whole profile implicitly.
- Shared JS/Rust `giteach-profile-surface-composition-v1` orders widget IDs for `github-profile-readme` and `portfolio` without copying widget data or rendering HTML/SVG/theme concerns inside GitTeach.
- Existing F4 document surfaces continue to own project/LinkedIn/CV text generation from curated claims; F7 does not duplicate that writing path.
- Real GitTeach + Kode presentation canary materializes only technology/tendency/domain widgets because those were the only supplied planes; GitHub README orders Technology before Development patterns, while Portfolio orders Development patterns before Technology.
- Final F7 verification: JavaScript 212/212 PASS; Rust 117 unit + 5 collector + 2 lifecycle + 2 technology-evolution integration = 126/126 PASS; fmt-check, strict Clippy and `git diff --check` PASS.

### F8 — local-first product vertical slice — DONE

GitTeach now pivots from building more internal profile contracts to becoming a usable product. The first shipped path is **desktop-first and local-first** so repository analysis does not require Mauro or another operator to pay for hosted compute/storage.

#### F8.1 — repository audit cache + selective hydration — DONE

- Existing local repositories can be analyzed in place by the Rust collector with zero network traffic.
- Remote repositories do **not** need a persistent checked-out clone. `giteach-repository-audit-cache-v1` keeps a blobless bare Git cache for current commit/tree metadata and path -> blob-OID identity.
- Refreshes compare remote HEAD and fetch only a shallow `--filter=blob:none` tree when it changed. Snapshot deltas identify added/modified/deleted paths without downloading their source bodies.
- A bounded target selector chooses manifests/docs/tests/tooling/profile signals and representative source files from path metadata before any blob is hydrated.
- Selected blobs are hydrated in a temporary blobless Git store, SHA-256 hashed/analyzed in memory, then the temporary store is deleted. Integration coverage verifies hydration does not populate the persistent audit cache with source blobs.
- The audit cache now feeds those transient blobs directly into `RepoEvidenceCollector`; selected hydrated bytes never require a persistent worktree.
- `RepoEvidenceBundle` carries explicit repository coverage: inventory coverage (`complete-policy-filtered` or `partial`), summary scope (`inventory` or `selected-content`) and known path count. Legacy bundles without coverage fail closed to partial selected-content rather than being treated as complete.
- `TechnologyFootprint` and `ProfileStatistics` propagate aggregate repository coverage, while the JS evidence adapter preserves the per-repository coverage receipt. Selected-content summaries therefore cannot masquerade as full-repository file/byte volume.
- `giteach-repository-audit-history-v1` persists commit/tree IDs plus path/blob OIDs for longitudinal comparison without storing source bytes or the audit-cache path. JSON is the current portable adapter; F9 replaces product persistence with SQLite.
- The earlier `giteach-repository-workspace-v1` clone-once worktree remains a tested prototype/reference, not the normal remote-analysis path.
- GitHub REST remains for account/repository metadata plus Releases/PRs/reviews/issues behind the existing serialized, conditional-cache, timeout and rate-limit/backoff boundary.
- F8.1 close gate: JavaScript core 213/213 PASS; Rust 121 unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution = 133/133 PASS; `cargo fmt --all -- --check`, strict Clippy and `git diff --check` PASS.

#### F8.2 — desktop shell — DONE

Use **Tauri 2 + a webview UI over the Rust core** rather than restoring the old Electron runtime or requiring a hosted analysis server. Rust owns local/audit acquisition, deterministic collection and durable audit/profile state; the web UI owns interaction/presentation. A future web companion may display/export already-produced profiles, but the primary analysis path must run on the user's machine.

Verified desktop slices:

- `crates/giteach-desktop` is the Tauri 2 native shell and calls `giteach-core` directly; no hosted analysis service is required.
- The webview source lives under `src/core/app/`. `runtime_info` makes the local-first runtime policy observable and repository analysis runs off the UI thread.
- The first slice established bounded local analysis through `giteach-local-repository-analysis-v1`, with repository coverage visible instead of presenting a bounded sample as full-repository volume.
- The second slice adds typed `RepositoryTarget` input for local folders or remote Git repositories plus `giteach-repository-analysis-v1`. The desktop stores its persistent blobless audit cache under app-local data and routes remote analysis through the existing `RepositoryAuditCacheManager` (`prepare_remote -> transient selected hydration -> collect_selected_evidence`).
- Remote acquisition exposes only bounded acquisition state (`initialized`/`updated`/`unchanged`), repository identity, explicit coverage, summary counts, languages and technology signals. Remote URLs, cache paths, raw `EvidenceRecord`, excerpts, hydrated hashes and source bodies do not cross into the webview; Git/audit failures are sanitized before presentation.
- The webview now supports manual local/remote repository connection and displays acquisition mode beside coverage. Embedded HTTP credentials are rejected by the existing audit boundary.
- The third slice adds `inspect_repository` and `giteach-repository-inspection-result-v1`. It reuses the same single local/remote acquisition and exposes a repository-only inspection beside the existing bounded analysis: at most 48 evidence records with only stable evidence id, repository path, evidence kind and byte count, plus deterministic project-domain candidates whose evidence refs resolve inside that visible bounded set.
- The inspection boundary is explicit: `personalExperienceClaimed = false`. Raw source bodies, excerpts, source/excerpt hashes, metadata, remote URL/cache path, confidence, seniority and skill scores do not cross into the webview. The UI now renders project-domain signals and their bounded provenance without converting repository evidence into personal experience.
- The fourth slice adds `inspect_profile` and `giteach-personal-profile-inspection-v1`. The webview can accumulate inspected repositories for the current session, submit an explicit subject actor key plus configured Git name/email, and inspect a cross-repository personal profile through the existing `DeveloperProfile` + `ActorEvidence` contracts.
- Personal attribution is fail-closed twice: `DeveloperProfile` filters ActorEvidence by subject/repository/capability-or-evidence attachment, and the desktop view narrows each visible capability to the exact support refs targeted by the contributing actor evidence. Mixed matched/unmatched repositories therefore expose only the actor-linked repository support; repository-only or unresolved attribution is omitted rather than promoted.
- The personal payload is bounded atomically to at most 32 repository targets, 24 attributable capabilities, 192 repository evidence records and 96 actor-evidence records. Every visible capability support ref, actor ref and actor target ref resolves inside the same payload. Local Git authorship remains `identity-linked` with implementation origin `unknown`; a remote repository without a connected attributable actor source remains repository-only.
- The fifth slice wires the existing F6 interview/reconciliation/publication contracts into the desktop through `prepare_profile_interview`, `answer_profile_interview` and `generate_profile_outputs`. `giteach-profile-interview-session-v1` exposes only bounded unresolved prompts whose repository/actor evidence refs resolve inside the returned session.
- Interview answers always re-enter the core as private `ProfileDeclaration v1`. The desktop cannot publish them implicitly: `approvedDeclarationIds` is the explicit per-declaration publication authority, unknown ids fail closed, and all non-approved declarations are forced back to `private` before `ProfilePublicationContext v1` is built.
- `giteach-profile-output-bundle-v1` exposes that sanitized approved publication context separately from five safe personal `DocumentInput` projections: GitHub profile README, portfolio card, LinkedIn project, LinkedIn skills and CV evidence. Raw evidence objects, repository paths, source/excerpt hashes, remote/cache paths and internal authorization/source metadata do not cross this webview boundary. The existing deterministic `DocumentDraftRenderer` renders those safe inputs rather than creating a second prose authority.
- The guided webview now lets the user prepare only remaining questions, save answers privately, approve individual declarations with explicit checkboxes and generate the five bounded drafts. Changing the selected repository set invalidates the guided-session state instead of silently reusing stale interview/publication data.
- The shell uses a local CSP and Tauri-generated capability schemas are treated as generated files.
- F8.2 close gate: JavaScript core 228/228 PASS; focused desktop view-model 15/15 PASS; Rust 121 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 8 desktop = 141/141 PASS; `cargo fmt --all -- --check`, strict Clippy, Node syntax checks and `git diff --check` PASS.

The complete F8 path is now wired end-to-end:

`connect/select repositories -> refresh local repo or remote audit snapshot -> hydrate only selected evidence -> analyze -> inspect repository evidence/domain profile -> inspect cross-repository personal profile with attribution -> reconcile/ask bounded F6 questions -> keep answers private -> explicitly approve publication declarations -> generate safe README/portfolio/CV/LinkedIn drafts`

F8 is closed. F9 is the next active phase and makes this product state durable in SQLite so reopening GitTeach does not restart repository connections, audit/profile snapshots, private declarations or publication consent from zero. Richer native picker UX can evolve without changing the verified F8 contracts; WidgetForge remains deliberately non-blocking until F12.

### F9 — durable local product persistence

Move product state to SQLite-backed local storage: known repositories, audit receipts (commit/tree/path/blob identities), analysis/evidence/profile snapshots, private declarations, publication consent, refresh metadata and semantic cache identity. Raw remote source bodies are not normal durable state. Reopening GitTeach must not restart the profile from zero.

F9.1 is closed: `giteach-core` owns an app-local SQLite product store for successful repository connections plus bounded remote audit receipt identity. Local connections retain reconnectable path and latest refresh summary; remote connections retain reconnectable target plus commit/tree/path/blob audit identity. Hydrated source bodies, excerpts, cache paths and transient object stores are not normal durable product state.

F9.2a is closed: SQLite schema v2 adds `giteach-repository-derived-snapshot-v1`, a bounded sanitized last-known repository inspection keyed to the persisted repository connection/head identity. It stores only the existing safe analysis summary, languages/technologies, at most 48 evidence receipts (`id/path/kind/bytes`) and deterministic project-domain provenance. It never stores `RepoEvidenceBundle` excerpts/arbitrary metadata, raw source, source/excerpt hashes, hydrated hashes or audit-cache/object-store paths. A changed committed HEAD invalidates the previous derived snapshot.

The desktop exposes `load_repository_snapshot` and a remembered-repository **Restore view** action. Restore reuses `giteach-repository-inspection-result-v1` rather than inventing a second UI truth contract, and it restores only the last bounded repository view. For a local dirty working tree, unchanged HEAD is not proof that the restored view is current, so the UI explicitly requires re-inspection before relying on current state.

F9.2b is closed: SQLite schema v3 adds `giteach-personal-profile-derived-snapshot-v1`. It persists only the bounded personal-profile inspection plane already allowed across the desktop boundary: attributable capabilities, bounded repository evidence receipts, bounded actor-evidence provenance and the associated counts/omission metadata. Snapshot identity uses the normalized exact actor matcher plus an order-independent unique repository-target set; the matcher values themselves are not stored in plaintext, duplicate repository targets fail closed, and repository-only or unresolved provenance cannot be persisted as a personal capability.

F9.3a is closed: SQLite schema v4 adds bounded private `ProfileDeclaration v1` persistence for direct `user-answer` interview declarations under the exact persisted personal-profile scope. Each profile stores at most 64 private declarations. The durable declaration payload deliberately omits `publicationStatus`, `authorizationRef` and `sourceHash`; reload reconstructs `publicationStatus=private`, and attempts to persist approved declarations fail closed. Schema v1/v2/v3 migrate forward without losing prior repository or profile state.

The desktop exposes `save_private_profile_declaration` and `load_private_profile_declarations`. Inspecting or restoring the same exact actor matcher + repository set reloads its private answers after restart. Publication consent is **not** persisted yet: `PROFILE_PUBLICATION_ENABLED=false` in both desktop policy surfaces, the UI exposes no approval control, and the native `generate_profile_outputs` command rejects publication while this persistence path is under extended testing. The underlying F8 publication contract remains regression-tested without granting current product permission.

Remaining F9 work:

- extended-test the F9.3a reopen/scope/privacy path while publication remains hard-locked; durable publication consent is deferred until a later explicit decision;
- move semantic-cache identity/reuse into the product database while preserving bounded freshness/provider-policy invalidation;
- define retention/migration/cleanup behavior for old snapshots, declarations and audit receipts without turning raw remote source into durable state;
- after the main/rebuild baseline is stable, modernize only the webview presentation layer to **Svelte 5 + Vite**, preserving the existing Tauri command surface, Rust-owned product truth, privacy boundaries and publication lock.

F9.3a verification: JavaScript core 232/232 PASS; Rust workspace 158/158 PASS (135 core unit + 6 collector + 1 repository-audit + 2 lifecycle + 1 repository-workspace + 2 technology-evolution + 11 desktop); `cargo fmt --all -- --check`, strict Clippy `-D warnings`, Node syntax checks and `git diff --check` PASS. QA remained headless; no commit/push was requested.

### F10 — profile experience + real outputs

Build the user-facing profile explorer: projects, technology history, tendencies, domains, maintenance/collaboration, `why does GitTeach think this?`, interview gaps and user-controlled publication. Make GitHub README, portfolio, CV and LinkedIn outputs usable/editable/exportable before adding decorative rendering systems.

### F11 — optional external evidence/profile adapters

Only after the local product works end-to-end, add useful authorized LinkedIn-like/profile providers, OmnySys, Bridge/MSSR receipts or other future sources. They remain adapters into existing declaration/evidence contracts, never runtime requirements or shared owners of the profile domain.

### F12 — WidgetForge visual renderer

Defer concrete WidgetForge HTML/SVG/theme design until real GitTeach usage shows which visualizations are worth maintaining. F7's stable `WidgetPlan` + `WidgetData` + `SurfaceComposition` contracts remain the integration boundary, so no F7 work is discarded while the renderer stays undefined.
