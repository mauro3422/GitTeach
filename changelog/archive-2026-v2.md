# Changelog Archive - v2.x (2026)

## [2.29.0] - Audit & Concurrency Reinforcement - 2026-01-18
### 🛡️ Integrity & Security
- **Mutex Implementation**: Added `isRefining` lock to `GlobalIdentityUpdater` to prevent race conditions during parallel streaming updates.
- **Async Fix**: Corrected missing `await` in `DeepCurator.processStreamingRepo` for the newly async context building.
- **Placeholder Purge**: Removed last "Analysis in progress..." remains from `DeepCurator` logic.

### 📜 Documentation
- **flujo_dato.md**: Created a new living document in project root to track data flow and pipeline architecture.

## [2.28.0] - Golden Knowledge Flow (Curated Summaries per Repo) - 2026-01-18
### 🧠 Repository Knowledge Curation
- **RepoContextManager.runCompaction**: Now generates structured JSON with:
  - `synthesis`: Dense paragraph summarizing repo understanding
  - `coherence_score`: 1-10 rating of architectural coherence
  - `health_indicators`: has_tests, has_docs, has_config, modular
  - `dominant_patterns`: Detected design patterns
  - `tech_stack_signals`: Technologies identified

### 💾 Persistence
- **Golden Knowledge saved to disk**: `repos/[name]/golden_knowledge.json`
- Added `persistRepoGoldenKnowledge`, `getRepoGoldenKnowledge`, `getAllGoldenKnowledge` to tracer

### 🔄 Mapper Optimization
- **Mappers now receive curated text**: Instead of 50 raw summaries, mappers get 1 curated paragraph
- Less cognitive load for mappers = faster + more coherent analysis
- Blueprint tracks `usedGoldenKnowledge` and `compactionMetrics`

### 📊 New Metrics Available
| Metric | Source | Purpose |
|--------|--------|---------|
| coherence_score | Compaction | How well code hangs together |
| health_indicators | Compaction | Quick health snapshot |
| dominant_patterns | Compaction | Design patterns detected |
| tech_stack_signals | Compaction | Technologies identified |

## [2.27.0] - Real-time Identity Evolution (Complete Unification) - 2026-01-18
### 🧬 Identity System Overhaul
- **Schema Unification**: `GlobalIdentityRefiner.mergeBlueprintInsights` now uses real mapper data
  - Reads from `blueprint.thematicAnalysis` (new schema) + fallback to `blueprint.technical` (old)
  - Extracts patterns, architectures, technologies, languages from actual mapper results
  - Stores `thematicData` with architecture, habits, and stack insights

### 🔄 Real Data Flow (No More Placeholders)
- **StreamingHandler._buildStreamingContext**: Now async, fetches real blueprints from cache
  - Replaces hardcoded "Analysis in progress..." with actual thematic analyses
  - Context includes real architecture/habits/stack data per repo

### 🖥️ CPU Offload
- **EvolutionManager.evolve**: Moved to CPU server (port 8002)
  - Identity synthesis no longer blocks GPU workers
  - Personality evolution happens in parallel with file analysis

### 📊 Impact
| Component | Before | After |
|-----------|--------|-------|
| GlobalIdentityRefiner | Ignored mapper data | Uses thematicAnalysis |
| StreamingContext | Placeholders | Real blueprint data |
| EvolutionManager | GPU (blocking) | CPU (parallel) |

## [2.26.0] - Incremental Identity Updates (Critical Fix) - 2026-01-18
### 🚨 Critical Bug Fix
- **FIXED**: `StreamingHandler.updateGlobalIdentity` was empty (only console.log)!
- User context was NEVER updated during streaming - now it evolves constantly.

### 🔄 Implementation
- Connected `updateGlobalIdentity` → `GlobalIdentityRefiner.refineGlobalIdentity`
- Identity updates incrementally as each repo completes
- Chat session context (`AIService.setSessionContext`) updated with fresh data
- Added `_buildSessionContextFromIdentity` helper for chat context

### 📊 Impact
| Before | After |
|--------|-------|
| Identity updated ONLY at final synthesis | Identity evolves constantly |
| Chat had stale context during analysis | Chat has fresh context |
| "Hormiga" updates = broken | "Hormiga" updates = working ✅ |

## [2.25.0] - Worker Distribution & Gatekeeper Fix - 2026-01-18
### 🔄 Flow Optimization
- **Worker Load Balancing**: Workers now distribute across different repos initially instead of all working on the same repo.
- **Improved Gatekeeper**: Critical mass now requires either:
  - 1 repo with 5+ analyzed files, OR
  - 2 repos with 2+ analyzed files
- Prevents bottleneck where all workers work on one repo while others wait.

### 🐛 Bug Fixes
- Fixed workers "stickiness" causing all workers to cluster on a single large repo.
- Gatekeeper no longer blocks synthesis when user has few but content-rich repos.

## [2.24.0] - Full CPU Offload - 2026-01-18
### 🚀 Complete GPU Liberation
- **Compaction → CPU**: Knowledge compaction now runs on CPU (8002), not competing with workers.
- **DNASynthesizer → CPU**: Final DNA synthesis runs on CPU, freeing GPU for chat.
- **RepoBlueprintSynthesizer → CPU**: Repo blueprint generation offloaded to CPU.

### 📊 Final Distribution
| Server | Components |
|--------|------------|
| GPU (8000) | Workers (3) + Chat (1) |
| CPU (8002) | Mappers + Compaction + DNASynth + Blueprint |
| CPU (8001) | Embeddings |

## [2.23.0] - Incremental Mappers per Repo - 2026-01-18
### 🚀 CPU Parallelism Revolution
- **Per-Repo Thematic Mapping**: Mappers now execute when each repo completes, not at the end.
  - Prevents context explosion (30 insights/repo vs 100+ at once)
  - CPU works in parallel with GPU workers
  - Profile builds incrementally
- **Blueprint Enhancement**: Each repo blueprint now includes full `thematicAnalysis`.
- **Smart Merge**: Final synthesis merges pre-calculated analyses instead of re-computing.

### 🔧 Technical Changes
- **StreamingHandler.synthesizeBlueprint**: Now calls `ThematicMapper` when repo has 5+ insights.
- **SynthesisOrchestrator.runDeepCurator**: Checks for pre-calculated analyses in blueprints.
- **New Method**: `_mergeThematicAnalyses()` combines per-repo analyses efficiently.

### 📊 Expected Gains
| Metric | Before | After |
|--------|--------|-------|
| CPU Idle | ~90% | **~20%** |
| Context Size | 100+ insights | **~30/repo** |
| Build Model | Serial | **Incremental** |

## [2.22.0] - Dual GPU/CPU Architecture - 2026-01-18
### 🚀 Parallel Processing Revolution
- **Dual Server Architecture**: Mappers now run on dedicated CPU server (Port 8002), freeing GPU for workers.
  - GPU Brain (8000): 4 slots for Workers + Chat
  - CPU Mappers (8002): 3 slots for parallel thematic mapping
  - Embeddings (8001): Unchanged
- **True Mapper Parallelism**: Architecture, Habits, and Stack mappers now execute simultaneously without competing for GPU slots.
- **Zero Contention**: Workers never wait for curators; curators never wait for workers.

### 🔧 Technical Changes
- **New Script**: `start_brain_cpu.bat` - Launches LFM2 Q8 on CPU with 6 threads and 3 parallel slots.
- **New Method**: `AIService.callAI_CPU()` - Dedicated endpoint for CPU-bound AI calls.
- **Updated Mappers**: `ArchitectureMapper`, `HabitsMapper`, `StackMapper` now use CPU endpoint.
- **Launcher Integration**: `start.bat` now launches all 3 servers automatically.

### 📊 Expected Performance Gains
| Metric | Before | After |
|--------|--------|-------|
| GPU Contention | High (mappers compete) | **Zero** |
| Mapper Execution | Sequential | **Parallel** |
| Worker Continuity | Interrupted by curators | **Uninterrupted** |

## [2.21.0] - Intelligence Fidelity & Timeout Resolution - 2026-01-18
### 🧠 Intelligence Polish
- **High-Fidelity Seeds**: Enabled real AI processing for the first 5 files of any run to capture deep behavioral patterns for Habits Forensics.
- **Habits Forensics Fix**: Broadened keyword sets and fixed summary mapping to prevent empty behavior reports.
- **Coverage Expansion**: Increased Tracer limits to 3 repos and 50 anchors, ensuring a robust diagnostic baseline (305 files reached).

### 🛡️ Reliability & Stability
- **Watchdog Hardening**: Increased Tracer simulation watchdog from 60s to 180s to accommodate complex agentic synthesis.
- **Ingestion Bug Fixed**: Resolved a critical silent failure in `FileAuditor.js` where `totalQueued` was being checked against an undefined property, disabling AI workers.
- **Counter Integrity**: Fixed seed counter race condition in `FileAuditor` to ensure accurate high-fidelity sampling.

## [2.20.0] - Hybrid Speed & Integrity - 2026-01-17
### 🚀 Performance Revolution (LFM 2.5 Hybrid)
- **Hybrid Architecture**: Split-Brain optimization (GPU Brain + CPU Memory) enabling true parallelism.
- **Continuous Batching**: Enabled `-cb` flag for LFM 2.5, unlocking >2x request throughput under load.
- **Latency Optimization**: Reduced "Thoughts" latency from ~6s to <1.5s via specialized prompt tuning.

### 🛡️ Critical Integrity Restoration
- **"Zero Insights" Fixed**: Resolved architectural race condition in `AIWorkerPool` that silently dropped findings.
- **Crash Eliminated**: Fixed `TypeError: durationMs` in `SynthesisOrchestrator` by enforcing strict JSON contrasts in Mappers.
- **Data Hardening**: Implemented "Emergency Interceptor" in `ProfileAnalyzer` to forcefully recover malformed findings (`summary`/`workerId` injection).
- **Metric Correction**: Fixed "564% Coverage" bug in `TracerEngine`.

### 🔧 Tooling
- **Tracer Diagnostics**: Added "Metabolic Delta" and "Bottleneck Forensics" to `SUMMARY.json`.
- **Stress Testing**: Added `test_parallel_batches.js` for verified load testing.

## [2.19.0] - Tracer Resilience & Forensic Repair - 2026-01-17
### Added
- **Flight Recorder (Session Logging)**: Re-enabled session logging in `TracerEngine.js` to capture AI reasoning (`thought`, `intent`, `whisper`) and chat interactions in JSONL format.
- **LevelDB Dynamic Fallback**: Implemented a robust dynamic import in `PersistenceMock.js` to handle ABI mismatches between Node.js and Electron, automatically falling back to an in-memory store.

### Fixed
- **ThematicMapper Syntax Corruption**: Resolved a critical `SyntaxError` caused by a duplicate/nested method declaration and orphaned braces that blocked the Tracer's analysis phase.
- **Missing Infrastructure**: Resolved Tracer boot failure by ensuring a default `context_user.json` exists in the root directory.

## [2.18.0] - Architecture Modernization - 2026-01-17
### Added
- **LevelDB Persistence**: Replaced flat JSON files with `classic-level` (LSM-Tree) for high-performance, granular data storage.
- **Embedding Batching**: Implemented a buffering mechanism in `MemoryManager` to batch embedding requests (10 nodes or 500ms).
- **Tracer LevelDB Support**: Updated `PersistenceMock` to use LevelDB, ensuring diagnostic sessions benefit from the same performance gains.

## [2.17.0] - Forensic Deep Fixes - 2026-01-17
### 🔧 Critical Bug Fixes (Based on Forensic Audit)
- **Race Condition in Indexing (FIXED)**: `MemoryManager.storeFinding()` now properly awaits `addNode()`, preventing premature searches on unindexed data.
- **Data Integrity / UID Loss (FIXED)**: `DeepCurator` and `StreamingHandler` now robustly normalize `file/path` and propagate `uid`, fixing broken references in the Traceability Map.
- **Smart RAG Context (FIXED)**: Split `AIService` context into `baseContext` (Persistent DNA) and `ragContext` (Ephemeral). Implemented `rebuildContext()` to manage RAG cleanup automatically.
- **Context Injection (FIXED)**: `ChatPromptBuilder` now detects RAG context and explicitly instructs the AI to CITE the injected memory correctly.
- **Weight Extraction (FIXED)**: `MemoryManager` now correctly extracts `confidence` and `complexity` weights even when nested in finding parameters.
- **Export Error Fix**: Fixed `AISlotManager` module export issue (`SyntaxError` in AIWorkerPool).

## [2.16.0] - Prompt Centralization - 2026-01-16
### Added
- **Centralized Prompts Directory**: Created `src/renderer/js/prompts/` structure:
    - `/workers/`: `AnalysisPrompts.js` & `ResponseSchema.js` (Code Analysis).
    - `/chat/`: `PersonaPrompts.js` (Chat Persona).
    - `/curator/`: `SynthesisPrompts.js` (DNA Synthesis).

### Refactored
- **WorkerPromptBuilder**: Delegated prompt generation to `AnalysisPrompts` and response schema to `ResponseSchema`.
- **ChatPromptBuilder**: Delegated persona logic to `PersonaPrompts`.
- **DNAPromptBuilder**: Delegated synthesis template logic to `SynthesisPrompts`.
- **Deleted**: `PromptTemplateManager.js` (Obsolete, Logic split between `ResponseParser` and `ResponseSchema`).

## [2.15.0] - Deep Refactoring (Metric & Worker Ecosystem) - 2026-01-16
### 🏗️ Phase 2: Deep Refactoring (Metric & Worker Ecosystem)
- **Decomposition of `WorkerPromptBuilder`**:
    - **PromptTemplates.js**: Centralization of system prompts and user templates.
    - **ResponseParser.js**: Robust parsing module with intelligent fallback logic.
    - **ResponseSchema.js**: Isolated definition of JSON schemas for structured validation.
- **Micro-Architecture of `MetricRefinery`**:
    - **MetricAggregatorOrchestrator**: New parallel orchestration engine for metrics.
    - **Strategy Pattern**: Implementation of 4 specialized aggregators (`Logic`, `Professional`, `Resilience`, `Semantic`) under a common `IMetricAggregator` interface.
    - **Extensibility**: Plug-and-play capability for new metric domains without modifying the core.

### 🖥️ Monitoring Dashboard V1 (Preview)
- **Standalone Dashboard**: Creation of `monitoring.html` with Cyberpunk/Terminal aesthetics.
- **Real-Time Telemetry**: Implementation of `BroadcastChannel` in `WorkerHealthMonitor` to emit live worker, queue, and memory metrics.
- **Worker Visualization**: Reactive grid showing the state (IDLE/PROCESSING/ERROR) of each worker in real-time.

## [2.13.0] - Modularization & SOLID (User-Led Refactor) - 2026-01-16
### 🏗️ Modularization & SOLID (User-Led Refactor)
- **Modular Decomposition**: Transformation of 6 monolithic modules (`DeepCurator`, `DNASynthesizer`, `CodeScanner`, `WorkerPromptBuilder`, `CacheRepository`, `AIWorkerPool`) into 17 specialized modules.
- **Facade Patterns**: Implementation of Facades for `DeepCurator` and others, delegating to specialized managers (`GlobalIdentityUpdater`, `SynthesisOrchestrator`).
- **CoT & Rules Integration**: Updated `IntentRouter` with imperative rules and improved Chain of Thought support.
- **Technical Debt Reduction**: 75% reduction in core file complexity.

### 🔧 Blueprint Metadata & Churn Fixes
- **Regression Fix**: Re-integration of `RepoBlueprintSynthesizer` into `GlobalIdentityUpdater` to ensure blueprint synthesis uses advanced logic engines.
- **Code Churn Propagation**: Fixed `file_meta` metadata pipeline from `GithubMock` to `MetricRefinery`.
- **Raw Findings Integration**: `RepoBlueprintSynthesizer` now consumes `rawFindings` to calculate accurate churn metrics (preventing data loss from insight filtering).

## [2.14.0] - Resilience & Error Forensics - 2026-01-16
### 🧬 Code Robustness & Error Forensics
- **Error Discipline Detection**: AI Workers now extract `error_discipline` (granularity of error handling) and `defensive_posture` (input validation) scores (0-5).
- **Anti-Pattern Tagging**: Automated detection of specific failure patterns (e.g., "Generic Catch", "Swallowed Exception") propagated to the global profile.
- **Resilience Aggregation**: `MetricRefinery` calculates global `resilience_report` including optimization scores and top anti-patterns.
- **DNA Synthesis Upgrade**: `DNASynthesizer` and `RepoBlueprintSynthesizer` now include a dedicated `resilience_context` and `forensics` section in the final JSON artifacts.

## [2.12.0] - Professional Context & Code Churn - 2026-01-16
### 💼 Code Churn & Professional Mapping
- **Integrated Code Churn Analysis**: Implemented `file_meta` extraction from GitHub API and ensured its flow through `CodeScanner`, `AIWorkerPool`, `MemoryManager`, and `MetricRefinery`.
- **Enhanced DNA Synthesis**: Updated `DNASynthesizer` to include holistic `professional_context` (Quality Index, Ecosystem Profile, Collaboration Style, Seniority Vibe, and Code Churn).
- **Professional Context Inference**: Workers now detect `code_quality` (Debt/Complexity), `ecosystem` (CI/CD tools/Cloud strategy), and `collaboration` (Mentoring/Review).
- **Holistic Professional DNA**: Final profile includes a `professional_context` summary in the Technical Identity.
- **Metadata Conduit**: Deep integration between `GithubMock` -> `CodeScanner` -> `Cache` -> `Analytics Engine`.

## [2.11.0] - Metadata Revolution & Semantic Identity - 2026-01-16
### 🧠 Semantic & Multidimensional Identity
- **Rich Semantic Metadata**: Workers now detect `business_context`, `design_tradeoffs`, and `stack_ecology` (tech version/maturity).
- **Multidimensional Metrics**: Aggregation of `social`, `security` (defensive posture), and `testability` metrics.
- **Dependency Ecology**: Automated mapping of framework maturity and tech adoption.
- **Tech Radar**: Implementation of `tech_radar` in Technical DNA (`adopt`, `trial`, `assess`, `hold`).
- **Extended Profile**: Final `technical_identity.json` now includes `extended_metadata` with holistic human/team scores.
- **Eye & Brain Upgrade**: Full update of `WorkerPromptBuilder`, `MetricRefinery`, and `DNASynthesizer`.

## [2.10.0] - Context Evolution Logging & Timing - 2026-01-16
- **Context Evolution Logging**: Implementation of `identity_evolution.jsonl` in `mock_persistence`. Captures snapshots of evolving `technical_identity` in real-time.
- **Metric Timing**: Inclusion of `durationMs` metric in worker logs and identity snapshots to measure synthesis latency.
- **Forensic Quality Audit**: Flow integrity verification `Raw Input -> Identity`. Confirmed data fidelity (0-5 scale) and self-correction of early aggregation artifacts.
- **Fixes**:
    - **Duplicate Logs**: Elimination of redundant logs in `ProgressReporter` that cluttered `SUMMARY.json`.
    - **Tracer Config**: Restored limit configuration (10 repos/15 files) for fast diagnostics.

## [2.9.0] - True Streaming & Seniority Signals - 2026-01-16
### 🌊 True Streaming & Optimization
- **True Streaming Architecture**: Implemented `onRepoComplete` event bridge between `Coordinator` and `DeepCurator` for instant findings processing.
- **Partial/Threshold Streaming**: Added logic to trigger updates every 3 files (`onRepoBatchReady`), enabling "Living Identity".
- **Critical Mass Gatekeeper**: Optimization that holds global synthesis until >2 repos are analyzed, saving massive compute resources.
- **Holistic Metrics**: `VersatilityIndex`, `ConsistencyScore`, and `EvolutionRate` now calculate in real-time.
- **Seniority Signals**: Implementation of Logic vs Knowledge tracking in `MetricRefinery`.

## [2.8.0] - Integral Security System & Docs - 2026-01-16
### 🛡️ Integral Security System
- **Firewall Service**: Complete monitoring of all HTTP/HTTPS communications with detailed logging.
- **Process Isolation**: Strict Main ↔ Renderer separation with IPC validation.
- **Token Security**: Secure storage of OAuth tokens in userData directory.
- **Network Monitoring**: Control of allowed domains and data leakage detection.

### 📚 Full Architectural Documentation
- **New Structure**: Folder `docs/architecture/` with exhaustive technical documentation.
- **Mermaid Diagrams**: Complete visual architecture with sequences and data flushes.
- **README Updated**: Complete documentation of all undocumented features.
- **Technical Manuals**: Detailed guides for each system module.

### 🔍 Forensic Audit System
- **Tracer Engine v2.1**: Complete audit with metabolic deltas and raw traffic logging.
- **Integrity Validation**: Automatic detection of anomalies in generated data.
- **Multi-Tier Tracing**: Analysis of 7 different system levels.
- **Real-Time Monitoring**: Streaming JSONL logs for workers and processes.

## [2.7.0] - Repo-Centric Data Refactor & Workers - 2026-01-16
### 📦 Repo-Centric Data Refactor
- **Persistent Repo Structure**: New storage hierarchy in `mock_persistence/repos/[RepoName]`.
- **Real-Time Findings**: Implementation of `raw_findings.jsonl` instantly generated by workers (~9KB audit logs).
- **Curated Memory Flush**: `persistAll()` mechanism ensuring `curated_memory.json` is saved at the end of the analysis phase.

### 🚄 Unified Worker Queue
- **Optimization**: Deprecation of `BackgroundAnalyzer.js` in favor of a unified queue in `AIWorkerPool`.
- **Priority Management**: Intelligent slot management (Urgent/Normal/Background) to not block the chat.
- **Data Preservation**: Critical fix in `EvolutionManager` to preserve `code_health` and `presentation` metadata during synthesis.

## [2.6.0] - Unified Queue & Tracer Robustness - 2026-01-16
### 🔧 Unified Worker Queue & Priority System
- **Unified Queue Architecture**: Elimination of redundant `BackgroundAnalyzer`. All AI tasks now flow through `QueueManager`.
- **Priority System (Urgent/Normal/Background)**: `CodeScanner` intelligently assigns priorities:
    - **URGENT**: Anchor files (README, package.json) for immediate response.
    - **BACKGROUND**: Other files processed with lower priority without blocking the chat.
- **Background Worker Logic**: `CodeScanner` now directly handles background file ingestion (`processBackgroundFiles`), integrating with the Tracer.

### 🛡️ Tracer Robustness & Memory Integrity
- **Embedded Mocking**: Definitive solution to `fetch failed` by simulating embeddings in diagnostic mode.
- **Explicit Context Export**: Guaranteed generation of `context_user.json` at the end, ensuring session continuity after restarts.
- **Integrity Validation**: Proactive detection of anomalies (e.g., Python in JS) and validation of `technical_identity.json` and `cognitive_profile.json` generation.

### ⚡ Performance & Offline Cache Strategy
- **Offline Code Cache**: Implementation of `aiSnippet` (3000 chars) in `PersistenceMock` and `repo_cache.json`.
    - The `CodeScanner` now prioritizes local loading of full code, eliminating GitHub API calls in re-scans.
    - Allows unlimited forensic diagnostics without Rate Limiting risk.
- **Tracer 10x10 Logic**: Diagnostic mode optimization to analyze only a representative sample (10 repos/10 anchors) in seconds.
- **AI Slot Concurrency Fixes**:
    - **Worker Force-Queue**: Critical fix forcing workers to process cached files in Tracer mode, ensuring the cognitive profile regenerates even after a memory reset.
    - **Intelligently Disabled**: Bottleneck prevention by disabling background analysis in Tracer mode.
    - **Slot Manager Integration**: Concurrency stabilization (5 slots) with clear priorities (URGENT/NORMAL/BACKGROUND).

## [2.5.0] - Brain-Voice Dance & Thinking Protocol - 2026-01-16
### 🎭 Brain-Voice Dance & User Context Flow
- **Brain-Voice Architecture**: Total decoupling between technical reasoning (**Brain**) and human vocalization (**Voice**).
    - The `IntentRouter` and `SystemEventHandler` now act as a unified **Cortex** that generates strategic "whispers".
    - The `ChatAgent` is the only authorized voice, using whispers to respond with a senior personality and without raw technical data leakage.
- **Curated Profile Flow**: Refactoring of `ContextBuilder` and `IntelligenceSynthesizer` to ensure only the refined technical identity impacts communication.
- **Unified Strategic Guidelines**: Migration of `chat_guidance` to `whisper_to_chat`, enriching internal communication between agents.

### 🧠 Thinking Agent & Autonomous RAG
- **Thinking Protocol (CoT)**: Implementation of an explicit reasoning cycle ("Thought") before each action. The AI now "piensa" and justifies which tool to use.
- **Autonomous RAG**: Deep integration of `QueryMemoryTool`. The Router intelligently decides when to inject technical memory context based on its own reasoning.
- **Tracer Resilience**:
    - **DOM Mocking**: Patched Tracer environment (`TracerEnvironment.js`) to support UI dependencies (ChatComponent) in headless mode.
    - **Network Stability**: IPv6/IPv4 fix in `Globals.js` to guarantee stable connection with local AI servers at `127.0.0.1`.
- **Verification Scripts**:
    - `scripts/verify_rag_flow.js`: Full flow test (Real AI + Memory).
    - `scripts/verify_reasoning.js`: Isolated unit test of the thinking protocol (Zero dependencies).

### ⚖️ Legal & Licensing
- **AGPL-3.0 License**: Adoption of the GNU Affero General Public License v3.0 to guarantee software freedom.
- **Copyright Protection**: Explicit copyright headers in the core code.
- **CLA**: Contributors License Agreement to intellectually protect the project and future contributions.

## [2.3.0] - Vector Identity & RAG Architecture - 2026-01-15
### 🧠 Vector Identity & RAG Architecture
- **Vectorial Memory Agent**: Implementation of `MemoryAgent.js` with semantic search based on local cosine similarity.
- **Dual Server Architecture**:
    - **Brain**: LFM 2.5 (1.2B) at Port 8000 (GPU).
    - **Memory**: Nomic Embeddings (v1.5) at Port 8001 (Dedicated CPU).
    - Infrastructure optimized to run both models simultaneously without competing for VRAM.
- **Auto-Provisioning**: The `start.bat` script now manages automatic download and verification of embedding models (~274MB).
- **Local RAG**: Real "Retrieval Augmented Generation" capability, allowing the AI to cite its own technical memory with mathematical precision.

## [2.2.0] - Core ESM & Intelligence Architecture - 2026-01-15
### ⚡ Core ESM & Intelligence Architecture
- **Total Migration to ESM (Main Process)**: Transformation of the Electron architecture from CommonJS to native ESM.
    - `src/main/index.js` and all Handlers/Services now use `import/export`.
    - Resolution of circular dependencies and shims for `__dirname`/`__filename`.
    - Removal of Node.js loading warnings via `"type": "module"`.
- **Persistence Modularization (CacheService)**: Decomposition of the synchronous cache service into specialized asynchronous managers.
    - `FileStorage.js`: Base physical I/O layer.
    - `RepositoryCacheManager.js`: Versioning (SHA) and summary logic.
    - `AuditLogManager.js`: Worker telemetry in JSONL.
    - `IntelligenceCacheManager.js`: Technical DNA and Cognitive Profile management.
- **Intelligence Layer Refactoring**:
    - `AIService` -> `IntentRouter` (Intent detection) and `ParameterConstructor` (Parameter extraction).
    - `ProfileAnalyzer` -> `FlowManager` (Analysis state) and `ReactionEngine` (Autonomous proactive chat).
    - `IntelligenceSynthesizer` -> `ComparisonEngine` (Identity deltas) and `EvolutionManager` (Evolution synthesis).
- **IPC API Standardization**:
    - Renamed `setWorkerAudit` to `appendWorkerLog` for greater semantic clarity.
    - Full synchronization between Renderer -> Preload -> Main.
- **Code Optimization**: Up to 90% reduction in base files, improving legibility and testability.

## [2.1.0] - Massive Modularization & Forensic Core - 2026-01-15
### 🧬 Massive Modularization & Forensic Core
- **Total Modularization**: Refactoring of 5 monolithic services into 18 specialized modules following the Single Responsibility Principle (SRP).
    - `AIWorkerPool` -> `QueueManager`, `RepoContextManager`, `WorkerPromptBuilder`.
    - `DeepCurator` -> `ThematicMapper`, `InsightsCurator`, `DNASynthesizer`.
    - `AIService` -> `SystemEventHandler`, `ChatPromptBuilder`.
    - `ProfileAnalyzer` -> `ContextBuilder`.
    - `ultimate_multitier_tracer` -> Modularized as `Tracer Engine` (7 modules).
- **Tracer Engine v2.1 (Forensic Edition)**:
    - **10x10 Rule**: Speed optimization limiting to 10 repos and 10 files/repo (~5x faster).
    - **Metabolic Delta**: Capturing 'Before/After' state of technical DNA.
    - **Raw AI Logging**: Intercepting `fetch` to save raw traffic in `chat/raw_stream.jsonl`.
    - **Resilience**: Periodic flush of `SUMMARY.json`.
    - **Integrity Audit**: Automatic validation of generated JSON artifacts.
- **Log Cleanup**: Silence of redundant logs in `AIService`, `CoordinatorAgent` and `DebugLogger`.
