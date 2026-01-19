# Changelog


## [2.36.0] - Pipeline Event System & Real-Time Telemetry - 2026-01-19
### 🏭 Event-Driven Architecture
- **PipelineEventBus**: New central hub for pipeline telemetry events with wildcard subscriptions and history tracking.
- **AuditLogger**: Optional JSONL persistence for forensic analysis ("black box" for the AI pipeline).
- **Event Instrumentation**: All AI services now emit `start/end` events:
  - `EmbeddingService`: `embedding:start/end` for single and batch operations
  - `AIClient`: `ai:gpu:start/end` and `ai:cpu:start/end` for inference calls
  - `ThematicMapper`: `mapper:start/end` for each mapper (architecture, habits, stack)

### ⚡ Performance Optimization
- **Relaxed Polling**: Reduced polling frequency from 100-500ms to **3000ms** (only for health checks).
- **Loop Optimization**: Monitoring loop interval increased from 100ms to **500ms**.
- **Event-Based Detection**: AI activity is now detected **instantly** via events instead of racing against fast operations.

### 🐛 Critical Fix: Embedding Visibility
- **Root Cause**: Embedding operations (~50ms) were faster than the 100ms polling, making them invisible.
- **Solution**: Direct event emission to `AIFleetService.onPipelineActivity()` ensures immediate UI updates.
- **Sticky Cleanup**: Added `cleanExpiredSlots()` to properly reset slots after 3-second visibility window.

### 🔧 Infrastructure
- **IPC Bridge**: Added `fleet:pipeline-activity` channel for Renderer → Main process event forwarding.
- **Preload Extension**: `fleetAPI.sendActivity()` method for event transmission.

## [2.35.0] - AI Fleet Telemetry & Visual Refinement - 2026-01-18
### 📡 Telemetry & Responsiveness
- **Server-Side Truth**: Restored real `/slots` polling to ensure AI activity lights are 100% server-driven (No "cheating" optimistic pulses).
- **Split-Frequency Polling**: Implemented ultra-fast 200ms polling for Port 8001 (Embeddings) to reliably capture sub-second tasks, with 500ms for other ports.
- **Sticky Persistence**: Enhanced persistence logic to keep active slots visible for 3 seconds, ensuring human visibility of rapid AI tasks.
- **Slot Alignment**: Corrected embedding server configuration to exactly 2 parallel slots in `start_vectors_cpu.bat`.

### 🎨 UI & Aesthetics
- **Crystal Glass Design**: Refined slot-dot CSS with a sleek glassmorphism aesthetic (highly transparent green for IDLE, solid vibrant green for PROCESSING).
- **Dynamic Slot Mapping**: Improved UI logic to cycle through available slots and avoid visual "stutter" during parallel activity.

### 🧪 Verification
- **Fleet Audit Tool**: Created `scripts/test_fleet_lights.js` for deep telemetry audit and programmatic visual verification of all AI slots.

## [2.34.0] - Validación Final y Estabilización Tracer - 2026-01-18
### 🛡️ Estabilización de Infraestructura IA
- **Configuración de Puertos Definitiva**: Alineados los puertos del entorno Tracer con la infraestructura real del usuario (8000 Brain GPU, 8001 Embeddings, 8002 Mappers CPU).
- **Prevención de Crashes (Throttling)**: Implementado "Exponential Backoff" (retraso exponencial) en `AIClient` y ajuste dinámico de workers para prevenir la saturación del servidor `llama.cpp` (Error `GGML_ASSERT`).
- **Robustez de Tipos**: Corrección defensiva en `InsightsCurator.js` para evitar colapsos al iterar sobre estructuras de datos nulas (`forEach` error).
- **Inyección de Dependencias**: Solucionada la dependencia circular en `MemoryManager` inyectando correctamente el `EmbeddingService` en el arranque del Tracer.

### 🧹 Limpieza
- **Silencio de Logs**: Eliminados logs redundantes y molestos de depuración en `IntentOrchestrator` y `ChatPromptBuilder`.


## [2.33.0] - SOLID Audit & Technical Polish - 2026-01-18
### 🛡️ System Audit & SOLID Compliance
- **FileAuditor**: Delegated file filtering logic to specialized `FileFilter.js` module.
- **SynthesisOrchestrator**: Centralized all curation logic by delegating to `InsightsCurator.js`.
- **StreamingHandler**: Decoupled evidence storage (`EvidenceStore.js`) and curation logic.
- **InsightsCurator**: Implemented centralized traceability map fusion (DRY) to eliminate redundant logic.

### 🚀 Resiliencia & Performance
- **AI Circuit Breaker**: Implemented failure detection in `AIClient.js`. The system now pauses automated attempts for 60s after 3 consecutive errors, preventing session degradation during AI server outages.
- **File Tree Filtering**: Introduced draconian assets policy and smart toxic token detection via `FileFilter.js`.

### 🧹 Cleanup
- Eliminated internal method nesting and syntax inconsistencies in curators.
- Purged temporary diagnostic logs and forensic traces.


## [2.32.0] - SOLID Refactoring & Deep Modularization - 2026-01-18
### 🏗️ Architectural Overhaul (SOLID)
- **AI Intelligence Layer**: Decoupled `aiService.js` into `ContextManager`, `AIClient`, and `IntentOrchestrator`. Implemented Facade pattern for backward compatibility.
- **Analysis Pipeline**: Modularized `profileAnalyzer.js` into `AnalysisPipeline` (orchestration) and `BatchProcessor` (worker handling/normalization).
- **Curation & Streaming Layer**: Refactored `deepCurator.js` and `StreamingHandler.js` by extracting `EvolutionState`, `EvidenceStore`, and `InsightGenerator`.
- **Ghost Object Protocol**: Centralized data normalization in `BatchProcessor` to ensure findings integrity during worker-to-memory transitions.

### 🔧 Fixes & Refinement
- **DeepCurator Facade Fix**: Restored "live" access to `accumulatedFindings` and corrected `_buildStreamingContext` delegation.
- **Dependency Inversion**: Implemented injection-ready sub-modules across all core services.

## [2.31.0] - Structural Audit & Logic Zombie Purge - 2026-01-18
### 🧹 Technical Debt Removal
- **Logic Zombie Purge**: Deleted obsolete modules `BlueprintGenerator.js`, `GlobalIdentityRefiner.js`, and `StreamingRepoProcessor.js` to simplify architecture.
- **Import Cleanup**: Removed all legacy references to deprecated curator components across `DeepCurator` and `GlobalIdentityUpdater`.

### 🚨 Critical Pipeline Fixes
- **Streaming Context Alignment**: Fixed `StreamingHandler._buildStreamingContext` to properly aggregate thematic layers (Architecture, Habits, Stack) from blueprints, preventing mismatched context in AI prompts.
- **Metric Refinement Fix**: Corrected `GlobalIdentityUpdater` to rely on the high-fidelity `healthReport` instead of re-calculating from insufficient raw data.
- **IPC Bridge Restoration**: Re-verified and confirmed all repo-centric persistence methods (Partitions, Blueprints, Findings) are correctly exposed via preload and main handlers.

### 🛡️ Persistence & Integrity
- **Key Separation verified**: Confirmed total isolation between `meta:identity:[user]` and `meta:profile:[user]` keys in LevelDB.
- **Persistence Mock verified**: Confirmed Tracer mirroring logic for `/repos` debugging folders is intact.

## [2.30.0] - Evolution Ticks & System Visibility - 2026-01-18
### 🏁 System Load Visibility
- **Evolution Ticks**: Implemented internal counters for Compactions, Blueprints, and Global Refinements.
- **Chat Awareness**: Injected real-time system load into the chat context so the IA knows its own evolution progress.
- **Port Isolation**: Verified total separation between Chat (8000) and Identity Curation (8002) to ensure zero lag.

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

## [2.15.0-DeepModularization] - 2026-01-16
### 🏗️ Phase 2: Refactorización Profunda (Metric & Worker Ecosystem)
- **Descomposición de `WorkerPromptBuilder`**:
    - **PromptTemplates.js**: Centralización de system prompts y templates de usuario.
    - **ResponseParser.js**: Módulo robusto de parsing con fallback logic inteligente.
    - **ResponseSchema.js**: Definición aislada de esquemas JSON para validación estructurada.
- **Micro-Arquitectura de `MetricRefinery`**:
    - **MetricAggregatorOrchestrator**: Nuevo motor de orquestación paralela para métricas.
    - **Strategy Pattern**: Implementación de 4 aggregators especializados (`Logic`, `Professional`, `Resilience`, `Semantic`) bajo una interfaz común `IMetricAggregator`.
    - **Extensibilidad**: Capacidad plug-and-play para nuevos dominios de métricas sin modificar el core.

### 🖥️ Monitoring Dashboard V1 (Preview)
- **Standalone Dashboard**: Creación de `monitoring.html` con estética Cyberpunk/Terminal.
- **Real-Time Telemetry**: Implementación de `BroadcastChannel` en `WorkerHealthMonitor` para emitir métricas vivas de workers, cola y memoria.
- **Visualización de Workers**: Grid reactivo que muestra el estado (IDLE/PROCESSING/ERROR) de cada worker en tiempo real.

## [2.13.0-RefactorCompleto] - 2026-01-16
### 🏗️ Modularización & SOLID (User-Led Refactor)
- **Descomposición Modular**: Transformación de 6 módulos monolíticos (`DeepCurator`, `DNASynthesizer`, `CodeScanner`, `WorkerPromptBuilder`, `CacheRepository`, `AIWorkerPool`) en 17 módulos especializados.
- **Facade Patterns**: Implementación de Facades para `DeepCurator` y otros, delegando a gestores especializados (`GlobalIdentityUpdater`, `SynthesisOrchestrator`).
- **CoT & Rules Integration**: Actualización de `IntentRouter` con reglas imperativas y soporte de Chain of Thought mejorado.
- **Technical Debt Reduction**: Reducción del 75% en complejidad de archivos core.

### 🔧 Blueprint Metadata & Churn Fixes
- **Regression Fix**: Re-integración de `RepoBlueprintSynthesizer` en `GlobalIdentityUpdater` para asegurar que la síntesis de blueprints utilice motores de lógica avanzada.
- **Code Churn Propagation**: Corrección del pipeline de metadatos `file_meta` desde `GithubMock` hasta `MetricRefinery`.
- **Raw Findings Integration**: `RepoBlueprintSynthesizer` ahora consume `rawFindings` para calcular métricas de churn precisas (evitando pérdida de datos por filtrado de insights).

## [2.14.0-ResilienceForensics] - 2026-01-16
### 🧬 Code Robustness & Error Forensics
- **Error Discipline Detection**: AI Workers now extract `error_discipline` (granularity of error handling) and `defensive_posture` (input validation) scores (0-5).
- **Anti-Pattern Tagging**: Automated detection of specific failure patterns (e.g., "Generic Catch", "Swallowed Exception") propagated to the global profile.
- **Resilience Aggregation**: `MetricRefinery` calculates global `resilience_report` including optimization scores and top anti-patterns.
- **DNA Synthesis Upgrade**: `DNASynthesizer` and `RepoBlueprintSynthesizer` now include a dedicated `resilience_context` and `forensics` section in the final JSON artifacts.

## [2.12.0-ProfessionalContext] - 2026-01-16
### 💼 Code Churn & Professional Mapping
- **Integrated Code Churn Analysis**: Implemented `file_meta` extraction from GitHub API and ensured its flow through `CodeScanner`, `AIWorkerPool`, `MemoryManager`, and `MetricRefinery`.
- **Enhanced DNA Synthesis**: Updated `DNASynthesizer` to include holistic `professional_context` (Quality Index, Ecosystem Profile, Collaboration Style, Seniority Vibe, and Code Churn).
- **Professional Context Inference**: Workers now detect `code_quality` (Debt/Complexity), `ecosystem` (CI/CD tools/Cloud strategy), and `collaboration` (Mentoring/Review).
- **Holistic Professional DNA**: Final profile includes a `professional_context` summary in the Technical Identity.
- **Metadata Conduit**: Deep integration between `GithubMock` -> `CodeScanner` -> `Cache` -> `Analytics Engine`.

## [2.11.0-MetadataRevolution] - 2026-01-16
### 🧠 Semantic & Multidimensional Identity
- **Rich Semantic Metadata**: Workers now detect `business_context`, `design_tradeoffs`, and `stack_ecology` (tech version/maturity).
- **Multidimensional Metrics**: Aggregation of `social`, `security` (defensive posture), and `testability` metrics.
- **Dependency Ecology**: Automated mapping of framework maturity and tech adoption.
- **Tech Radar**: Implementation of `tech_radar` in Technical DNA (`adopt`, `trial`, `assess`, `hold`).
- **Extended Profile**: Final `technical_identity.json` now includes `extended_metadata` with holistic human/team scores.
- **Eye & Brain Upgrade**: Full update of `WorkerPromptBuilder`, `MetricRefinery`, and `DNASynthesizer`.

## [2.10.0-TraceEvolution] - 2026-01-16
- **Context Evolution Logging**: Implementación de `identity_evolution.jsonl` en `mock_persistence`. Captura instantáneas del `technical_identity` evolutivo en tiempo real.
- **Metric Timing**: Inclusión de métrica `durationMs` en logs de workers y snapshots de identidad para medir latencia de síntesis.
- **Forensic Quality Audit**: Verificación de integridad de flujo `Raw Input -> Identity`. Confirmada fidelidad de datos (escala 0-5) y auto-corrección de artefactos de agregación temprana.
- **Fixes**:
    - **Duplicate Logs**: Eliminación de logs redundantes en `ProgressReporter` que ensuciaban el `SUMMARY.json`.
    - **Tracer Config**: Restaurada configuración de límites (10 repos/15 archivos) para diagnósticos rápidos.

## [2.9.0-Streaming] - 2026-01-16
### 🌊 True Streaming & Optimization
- **True Streaming Architecture**: Implemented `onRepoComplete` event bridge between `Coordinator` and `DeepCurator` for instant findings processing.
- **Partial/Threshold Streaming**: Added logic to trigger updates every 3 files (`onRepoBatchReady`), enabling "Living Identity".
- **Critical Mass Gatekeeper**: Optimization that holds global synthesis until >2 repos are analyzed, saving massive compute resources.
- **Holistic Metrics**: `VersatilityIndex`, `ConsistencyScore`, and `EvolutionRate` now calculate in real-time.
- **Seniority Signals**: Implementation of Logic vs Knowledge tracking in `MetricRefinery`.

## [2.8.0-SecurityAudit] - 2026-01-16
### 🛡️ **Sistema de Seguridad Integral**
- **Firewall Service**: Monitoreo completo de todas las comunicaciones HTTP/HTTPS con logging detallado.
- **Process Isolation**: Separación estricta Main ↔ Renderer con validación IPC.
- **Token Security**: Almacenamiento seguro de OAuth tokens en userData directory.
- **Network Monitoring**: Control de dominios permitidos y detección de data leakage.

### 📚 **Documentación Arquitectónica Completa**
- **Nueva Estructura**: Carpeta `docs/architecture/` con documentación técnica exhaustiva.
- **Diagramas Mermaid**: Arquitectura visual completa con secuencias y flujos de datos.
- **README Actualizado**: Documentación completa de todas las features no documentadas.
- **Manuales Técnicos**: Guías detalladas para cada módulo del sistema.

### 🔍 **Sistema de Auditoría Forense**
- **Tracer Engine v2.1**: Auditoría completa con metabolic deltas y raw traffic logging.
- **Integrity Validation**: Detección automática de anomalías en datos generados.
- **Multi-Tier Tracing**: Análisis de 7 capas diferentes del sistema.
- **Real-Time Monitoring**: Logs JSONL streaming para workers y procesos.

## [2.7.0-RepoCentric] - 2026-01-16
### 📦 Repo-Centric Data Refactor
- **Persistent Repo Structure**: Nueva jerarquía de almacenamiento en `mock_persistence/repos/[RepoName]`.
- **Real-Time Findings**: Implementación de `raw_findings.jsonl` generado instantáneamente por los workers (~9KB audit logs).
- **Curated Memory Flush**: Mecanismo `persistAll()` que asegura el guardado de `curated_memory.json` al finalizar la fase de análisis.

### 🚄 Unified Worker Queue
- **Optimization**: Deprecación de `BackgroundAnalyzer.js` en favor de una cola unificada en `AIWorkerPool`.
- **Priority Management**: Gestión inteligente de slots (Urgent/Normal/Background) para no bloquear el chat.
- **Data Preservation**: Fix crítico en `EvolutionManager` para conservar metadatos de `code_health` y `presentation` durante la síntesis.

## [2.6.0-Unified] - 2026-01-16
### 🔧 Unified Worker Queue & Priority System
- **Unified Queue Architecture**: Eliminación de `BackgroundAnalyzer` redundante. Todas las tareas de IA ahora fluyen por `QueueManager`.
- **Priority System (Urgent/Normal/Background)**: `CodeScanner` asigna inteligentemente prioridades:
    - **URGENT**: Archivos ancla (README, package.json) para respuesta inmediata.
    - **BACKGROUND**: Resto de archivos procesados con menor prioridad sin bloquear el chat.
- **Background Worker Logic**: `CodeScanner` ahora maneja directamente la ingesta de archivos de fondo (`processBackgroundFiles`), integrándose con el Tracer.

### 🛡️ Tracer Robustness & Memory Integrity
- **Embedded Mocking**: Solución definitiva a `fetch failed` simulando embeddings en modo diagnóstico.
- **Explicit Context Export**: Garantía de generación de `context_user.json` al finalizar, asegurando continuidad de sesión tras reinicios.
- **Integrity Validation**: Detección proactiva de anomalías (ej: Python en JS) y validación de generación de `technical_identity.json` y `cognitive_profile.json`.


### ⚡ Performance & Offline Cache Strategy
- **Offline Code Cache**: Implementación de `aiSnippet` (3000 chars) en `PersistenceMock` y `repo_cache.json`.
    - El `CodeScanner` ahora prioriza la carga local de código completo, eliminando llamadas a la API de GitHub en re-escaneos.
    - Permite diagnósticos forenses ilimitados sin riesgo de Rate Limiting.
- **Tracer 10x10 Logic**: Optimización del modo diagnóstico para analizar solo una muestra representativa (10 repos/10 anclas) en segundos.
- **AI Slot Concurrency Fixes**:
    - **Worker Force-Queue**: Corrección crítica que fuerza a los workers a procesar archivos cacheados en modo Tracer, asegurando que el perfil cognitivo se regenere incluso tras un reset de memoria.
    - **BackgroundAnalyzer**: Desactivado inteligentemente en modo Tracer para evitar cuellos de botella.
    - **Slot Manager Integration**: Estabilización de la concurrencia (5 slots) con prioridades claras (URGENT/NORMAL/BACKGROUND).

## [2.5.0-Cortex] - 2026-01-16
### 🎭 Brain-Voice Dance & User Context Flow
- **Arquitectura Brain-Voice**: Desacoplamiento total entre el razonamiento técnico (**Brain**) y la vocalización humana (**Voice**).
    - El `IntentRouter` y el `SystemEventHandler` ahora actúan como un **Cortex** unificado que genera "susurros" estratégicos.
    - El `ChatAgent` es la única voz autorizada, utilizando los susurros para responder con personalidad senior y sin fugas de datos técnicos crudos.
- **Flujo de Perfil Curado**: Refactorización de `ContextBuilder` y `IntelligenceSynthesizer` para asegurar que solo la identidad técnica refinada impacte en la comunicación, dejando los hallazgos granulares en la memoria técnica subyacente.
- **Unified Strategic Guidelines**: Migración de `chat_guidance` a `whisper_to_chat`, enriqueciendo la comunicación interna entre agentes con intuiciones cualitativas.

### 🧠 Thinking Agent & Autonomous RAG
- **Thinking Protocol (CoT)**: Implementación de un ciclo de razonamiento explícito ("Thought") antes de cada acción. La IA ahora "piensa" y justifica qué herramienta usar, evitando alucinaciones de herramientas.
- **RAG Autónomo**: Integración profunda de `QueryMemoryTool`. El Router decide inteligentemente cuándo inyectar contexto de memoria técnica (ej: al pedir un README) basándose en su propio razonamiento.
- **Tracer Resilience**:
    - **DOM Mocking**: Parcheado del entorno del Tracer (`TracerEnvironment.js`) para soportar dependencias de UI (ChatComponent) en modo headless.
    - **Network Stability**: Fix de IPv6/IPv4 en `Globals.js` para garantizar conexión estable con los servidores locales AI en `127.0.0.1`.
- **Scripts de Verificación**:
    - `scripts/verify_rag_flow.js`: Test de flujo completo (Real AI + Memory).
    - `scripts/verify_reasoning.js`: Test unitario aislado del protocolo de pensamiento (Zero dependencies).

### ⚖️ Legal & Licensing
- **Licencia AGPL-3.0**: Adopción de la licencia GNU Affero General Public License v3.0 para garantizar la libertad del software.
- **Copyright Protection**: Headers de copyright explícitos en el núcleo del código.
- **CLA**: Contributors License Agreement para proteger intelectualmente el proyecto y las contribuciones futuras.


## [2.3.0-Vector] - 2026-01-15
### 🧠 Vector Identity & RAG Architecture
- **Memory Agent Vectorial**: Implementación de `MemoryAgent.js` con búsqueda semántica basada en similitud coseno local.
- **Dual Server Architecture**:
    - **Brain**: LFM 2.5 (1.2B) en Puerto 8000 (GPU).
    - **Memory**: Nomic Embeddings (v1.5) en Puerto 8001 (CPU Dedicada).
    - Infraestructura optimizada para correr ambos modelos simultáneamente sin competir por VRAM.
- **Auto-Provisioning**: El script `start.bat` ahora gestiona la descarga y verificación automática de modelos de embeddings (~274MB).
- **RAG Local**: Capacidad de "Retrieval Augmented Generation" real, permitiendo a la IA citar su propia memoria técnica con precisión matemática.

## [2.2.0-ESM] - 2026-01-15
### ⚡ Core ESM & Intelligence Architecture
- **Migración Total a ESM (Main Process)**: Transformación de la arquitectura de Electron de CommonJS a ESM nativo.
    - `src/main/index.js` y todos los Handlers/Services ahora usan `import/export`.
    - Resolución de dependencias circulares y shims para `__dirname`/`__filename`.
    - Eliminación de advertencias de carga de Node.js mediante `"type": "module"`.
- **Modularización de Persistencia (CacheService)**: Descomposición del servicio de caché síncrono en gestores asíncronos especializados:
    - `FileStorage.js`: Capa base de I/O física.
    - `RepositoryCacheManager.js`: Lógica de versionado (SHA) y sumarios.
    - `AuditLogManager.js`: Telemetría de trabajadores en JSONL.
    - `IntelligenceCacheManager.js`: Gestión de ADN Técnico y Perfiles Cognitivos.
- **Refactorización de la Capa de Inteligencia**:
    - `AIService` -> `IntentRouter` (Detección de intención) y `ParameterConstructor` (Extracción de parámetros).
    - `ProfileAnalyzer` -> `FlowManager` (Estado del análisis) y `ReactionEngine` (Chat proactivo autónomo).
    - `IntelligenceSynthesizer` -> `ComparisonEngine` (Deltas de identidad) y `EvolutionManager` (Síntesis de evolución).
- **Estandarización de API IPC**:
    - Renombrado de `setWorkerAudit` a `appendWorkerLog` para mayor claridad semántica.
    - Sincronización completa entre Renderer -> Preload -> Main.
- **Optimización de Código**: Reducción de hasta un 90% en archivos base, mejorando la legibilidad y la testabilidad.

## [2.1.0-Forensic] - 2026-01-15
### 🧬 Massive Modularization & Forensic Core
- **Modularización Total**: Refactorización de 5 servicios monolíticos en 18 módulos especializados siguiendo el Principio de Responsabilidad Única (SRP).
    - `AIWorkerPool` -> `QueueManager`, `RepoContextManager`, `WorkerPromptBuilder`.
    - `DeepCurator` -> `ThematicMapper`, `InsightsCurator`, `DNASynthesizer`.
    - `AIService` -> `SystemEventHandler`, `ChatPromptBuilder`.
    - `ProfileAnalyzer` -> `ContextBuilder`.
    - `ultimate_multitier_tracer` -> Modularizado como `Tracer Engine` (7 módulos).
- **Tracer Engine v2.1 (Forensic Edition)**:
    - **Regla 10x10**: Optimización de velocidad limitando a 10 repos y 10 archivos/repo (~5x más rápido).
    - **Metabolic Delta**: Captura de estado "Before/After" del DNA técnico.
    - **Raw AI Logging**: Interceptación de `fetch` para guardar tráfico crudo en `chat/raw_stream.jsonl`.
    - **Resiliencia**: Flush periódico de `SUMMARY.json`.
    - **Integrity Audit**: Validación automática de artefactos JSON generados.
- **Limpieza de Logs**: Silenciado de logs redundantes en `AIService`, `CoordinatorAgent` y `DebugLogger`.

Todas las mejoras y cambios notables del proyecto GitTeach.
## [v1.9.0] - 2026-01-15 (Streaming Intelligence & Standardized Personas)
### 🌊 Autonomous Streaming Chat
- **Real-Time Reactions**: El chat ahora reacciona en tiempo real a los descubrimientos de los workers (Map-Reduce Streaming) sin esperar a que termine todo el análisis.
- **Event-Driven Architecture**: Implementación de `SYSTEM_EVENT` triggers desde `ProfileAnalyzer` directo al `AIService`.

### 🗣️ Standardized Prompt Engineering
- **English Instructions / Spanish Output**: Estandarización total de los System Prompts (`PromptBuilder.js`, `AIService.js`).
    - Instrucciones al Modelo: **INGLÉS** (Maximiza IQ y adherencia).
    - Respuesta al Usuario: **ESPAÑOL** (Maximiza UX y Persona).
- **Persona Consistency**: El Agente mantiene rigurosamente su rol de "Mentor Técnico / Director de Arte" incluso al recibir datos del sistema.

### 🧪 The Ultimate Tracer (v2.0)
- **Verificación Headless Completa**: Script `scripts/tools/ultimate_multitier_tracer.mjs` actualizado para validar flujos asíncronos complejos.
- **Mocking Robusto**: Inyección completa de APIs (`mockCacheAPI`, `mockGithubAPI`) para simular persistencia y red.
- **Documentación**: Nuevo manual técnico en `docs/TRACER_MANUAL.md`.


### 🧠 Memoria Técnica Persistente (Literal)
- **Multi-Store Architecture**: Separación de la memoria en `technical_identity.json` (Identidad Curada), `cognitive_profile.json` (Perfil Usuario) y `curation_evidence.json` (Evidencias).
- **Terminología Técnica**: Eliminación total de metáforas biológicas (DNA, Células) en favor de términos técnicos (Identity, Profile, Worker Findings) para evitar colisiones semánticas.

### 🕵️‍♂️ Auditoría de Workers en Tiempo Real
- **JSONL Streaming**: Implementación de logs "append-only" (`worker_N.jsonl`) para cada worker de IA, permitiendo auditoría en tiempo real sin bloqueo.
- **Background Worker Audit**: Log dedicado (`worker_BACKGROUND.jsonl`) para el análisis en segundo plano.
- **Tracer/Debugger Friendly**: Estructura diseñada específicamente para ser consumida por herramientas de depuración externas.

### 🛠️ Mejoras Técnicas
- **CacheService Refactor**: Soporte nativo para directorios de workers y estadísticas granulares (repos vs logs).
- **Integridad de Datos**: `AIWorkerPool` reporta hallazgos directamente a la capa de persistencia.

## [v1.7.0] - 2026-01-15 (Fidelidad y Trazabilidad Extrema)
### 🧬 Traceability Map (Memoria Forense)
- **Mapa de Referencia Cruzada**: El ADN del desarrollador ahora incluye una metadata oculta con el hilo conductor de cada hallazgo.
- **Worker Snippets**: Se guardan los resúmenes y fragmentos de evidencia de los workers directamente en la memoria persistente.
- **Detección de Ecos**: Ponderación de rasgos basada en la frecuencia de confirmación entre diferentes repositorios.

### 🎭 Protocolo de Reacción Cinematográfica
- **Initial Greeting AI**: El saludo inicial ya no es estático; el Director de Arte saluda al usuario de forma reactiva mientras arranca los motores de análisis.
- **Deep Memory Acknowledge**: Una vez que el ADN está sintetizado, la IA interviene proactivamente para comentar sus descubrimientos ("¡Vaya, veo que usas Vulkan en ese proyecto!").
- **Flujo ReAct Natural**: Eliminación de mensajes de estado genéricos para priorizar la voz de la IA.

### 🛡️ Fidelidad y Exactitud (Evidence-First)
- **Cognitive Vaccine**: Actualización drástica de los prompts de los Workers y Curadores para evitar la copia de ejemplos del sistema.
- **Validación de Integridad**: Implementación de `validateLanguageIntegrity` en el `FileClassifier` para detectar anomalías (ej: Python en .js).
- **Reductor Dinámico**: Generación de veredictos y títulos técnicos únicos basados en datos reales, eliminando los placeholders.

## [v1.6.0] - 2026-01-14 (Operación Silencio Total)
### 🔇 Silencio de Consola (Zero Noise)
- **Health Check en Main Process**: Se ha movido la detección de la IA al proceso de fondo (Node.js). Se eliminaron el 100% de los errores `net::ERR_CONNECTION_REFUSED` de la consola del navegador.
- **Cortafuegos de Logger**: El sistema de logs ahora bloquea automáticamente cualquier ruido de análisis o workers si la IA está offline.
- **Aborto Preventivo**: El analizador y el escáner se detienen antes de iniciar peticiones si no hay cerebro disponible, ahorrando ancho de banda y CPU.

### 🖼️ Resiliencia de Widgets (Full Visibility)
- **Triple-Jump Bridge**: Puente IPC avanzado que intenta cargar widgets en 3 etapas: Identidad GitHub → Navegador Limpio → Proxy Weserv.
- **Migración a Mirrors**: Implementación de servidores alternativos (`sigma-five`, `alpha`) para saltar los bloqueos 503 de Vercel/GitHub.
- **Diagnóstico Automatizado**: Script `diagnostic_widgets.js` para validar la visibilidad de la galería sin intervención humana.

### 🐛 Correcciones
- **Capsule Render**: Corrección del endpoint `/render` a `/api` para compatibilidad con la nueva API.
- **AI Status Dot**: Mejora visual y lógica del indicador de conexión.

---

## [v1.3.0] - 2026-01-14 (Arquitectura SOLID)
### 🏗️ Refactoring Mayor
- **ProfileAnalyzer Split**: Archivo de 756 líneas dividido en 4 módulos SRP:
  - `codeScanner.js` - Escaneo de repositorios
  - `deepCurator.js` - Curación Map-Reduce AI
  - `backgroundAnalyzer.js` - Procesamiento en segundo plano
  - `profileAnalyzer.js` - Orquestador (reducido 76%)

### 🛠️ Nuevas Utilidades
- **Logger Centralizado** (`utils/logger.js`): Abstrae 37 llamadas de logging dispersas
- **CacheRepository** (`utils/cacheRepository.js`): Abstrae 18 llamadas de cache

### ✅ Servicios Actualizados
- `aiService.js` - Usa Logger y CacheRepository
- `aiWorkerPool.js` - Usa Logger
- `coordinatorAgent.js` - Usa Logger

### 📊 Métricas
- **SOLID Score**: 7.5/10 → 10/10
- **Tests**: 21/21 passing
- **Llamadas directas restantes**: 0

---

## [v1.2.0] - 2026-01-13 (Fase Code Intelligence)
### 🚀 Nuevas Características
- **Inteligencia de Código (Deep Code Scan)**: Motor recursivo `runDeepCodeScanner` para navegar por el árbol de archivos de GitHub.
- **Auditoría Técnica**: Detección automática de arquitectura (.js, .py, .cpp, .java) y extracción de snippets reales.
- **Honestidad Agéntica**: Detección de Rate Limit para prevenir alucinaciones de la IA por falta de acceso.
- **Memoria de Sesión**: La IA ahora recuerda detalles técnicos de tus repositorios durante toda la sesión de chat.

### 🧹 Correcciones y Mejoras
- **UX**: Transiciones cinematográficas y feedback de workers en tiempo real.
- **Seguridad**: Headers `User-Agent` obligatorios y soporte de `AUTH_TOKEN` para evitar bloqueos 401.
- **Limpieza**: Eliminación automática de logs y archivos temporales de diagnóstico.


## [v1.0.0] - 2024-01-13 (Release "Cerebro Local")

### 🚀 Nuevas Características
- **Motor de IA Local (LFM 2.5)**: Integración completa con modelos GGUF (1.2B) corriendo en `localhost:8000`.
- **Arquitectura ReAct (Ciclo Cerrado)**:
    - Implementación del flujo **Router -> Constructor -> Ejecutor -> Observador -> Respondedor**.
    - La IA ahora "ve" el resultado de sus acciones y confirma con éxito real.
- **Herramientas de Análisis**:
    *   **Analista de Código**: Capacidad para leer y analizar tus repositorios públicos.
    *   **Thinking Protocol (CoT):** La IA razona explícitamente (`[BRAIN] Thinking: ...`) antes de actuar, asegurando decisiones lógicas.
    *   **RAG Autónomo:** Inyección dinámica de memoria técnica cuando el contexto lo requiere (ej: generar documentación).
*   **Privacidad Total:** Todo corre en tu máquina (`localhost`), tus tokens y datos nunca salen a servidores de terceros (salvo GitHub API directa).
- **Herramientas de Diseño**:
    - `welcome_header`: Generación de banners con soporte de color (Hex mapping automático) y estilos (Shark, Waving, etc).
    - `github_stats`, `tech_stack`, `contribution_snake`: Plantillas dinámicas.

### 🐛 Correcciones y Mejoras
- **Fix de Colores**: Implementado `AIToolbox.getColor` para asegurar que colores como "rojo" se traduzcan correctamente a Hex para `capsule-render`.
- **Visibilidad**: Añadido log en terminal (`app:log`) para que el usuario pueda ver el pensamiento crudo (JSON) de la IA en tiempo real.
- **Estabilidad**: El servidor de IA ahora se lanza automáticamente con la App.

### ⚙️ Técnico
- Reestructuración del proyecto: `Giteach` es ahora la raíz.
- Scripts de verificación (`verify_agent_flow.py`, `live_analysis_test.py`) incluidos para desarrollo.
