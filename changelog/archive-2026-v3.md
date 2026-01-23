# Changelog Archive - v3 (2026)

## [2.43.0] - Core Architecture Refactor & SOLID Modularization - 2026-01-19
### 🧱 Architectural Overhaul: SRP Decomposition
- **FileAuditor Facade**: Refactored `FileAuditor.js` into a coordinating facade, delegating responsibilities to specialized services:
  - `FileDownloader`: Handles GitHub API and cache I/O.
  - `FileProcessor`: Manages worker enqueuing and High-Fidelity seed logic.
  - `FindingsCurator`: Specialized in file classification and AI finding curation.
- **PipelineStateManager Split**: Decomposed the monolithic state manager into granular managers:
  - `NodeManager`: Atomic state and health management.
  - `HistoryManager`: Operation tracking with fuzzy matching support.
  - `DynamicSlotManager`: Unlimited repository slot assignment logic.
- **Pipeline Config & Colors**: Extracted magic numbers and UI theme tokens to `pipelineConfig.js` and `colors.js`.

### 🧠 Performance & Intelligence Flow
- **Strategy Pattern Integration**: Replaced complex `if/else` logic in `PipelineEventHandler` with a clean Strategy Pattern for event and status handling.
- **Unified Error Handling**: Introduced `src/renderer/js/utils/ErrorHandler.js` for consistent error management and async safety across the application.
- **Enhanced Integrity Testing**: Created `verify_refactor_integrity.js` (ESM) to automate regression testing of the pipeline visualizer.

### 🏃 Reactive Queue & Load Balancing
- **Push-Based Signaling**: Implemented `waitForItems()` in `QueueManager` using `Promise` resolvers to eliminate polling latency in workers.
- **Intelligent Slot Distribution**: Fixed Slot 1 inactivity by implementing aggressive least-loaded repository assignment and worker-repo affinity.
- **Graceful Termination**: Prevented premature worker shutdown by implementing an explicit waiting state for trailing enqueue operations.

---

## [2.42.0] - Pipeline SOLID Refactor & Visual Telemetry - 2026-01-19
### 🧱 Architectural Santiation: SOLID Modularization
- **Decoupled Orchestration**: Refactored `PipelineCanvas.js` from 522 to ~150 lines, delegating responsibilities to specialized modules.
- **PipelineStateManager**: Centralized all node states (`nodeStates`), statistics (`nodeStats`), history (`nodeHistory`), and health telemetry (`nodeHealth`).
- **PipelineEventHandler**: Extracted complex event processing and transition logic, including idempotent start handling and handover coordination.
- **PipelineSimulation**: Isolated debugging tools and flow simulations, keeping production code clean of development utilities.

### 💓 AI Communication Monitoring (Dispatch/Receive)
- **Visual Pulse Signals**: Implemented blue dashed rings (`dispatching`) and solid green rings (`receiving`) around worker nodes to monitor real-time AI service latency.
- **Temporal Fidelity**: Refined pulses to a 1.5s duration to ensure high-speed interactions remain visible without saturating the UI.
- **Direct Event Emission**: Integrated `summarizeWithAI` in `WorkerHealthMonitor` with distinct pulse events for outgoing and incoming traffic.

---

## [2.41.0] - Real-Time Hardware Vigilance & Data Fidelity - 2026-01-19
### 💓 Hardware Monitoring: AI Fleet Heartbeat
- **Real-Time Connectivity**: Integrated visualizer with `AIFleetService` to monitor AI server health (Ports 8000, 8001, 8002) every 3 seconds.
- **Fault Visualization**: Nodes now reflect real-world server failures with red "OFFLINE" badges and dashed indicators.
- **Direct Telemetry**: Linked renderer-side `FleetMonitor` to the pipeline event bus for instant health updates.

### 🛣️ Data Flow & Visual Fidelity
- **Pipeline Highway**: Implemented visual "Traveling Packages" to show the movement of data between stages instead of instant count jumps.
- **State Machine Refinement**: Differentiated `active` (pulsing emerald) from `pending` (steady holding green) states, ensuring slots accurately represent processing vs result-holding.
- **Successor-Pull Mechanism**: Handover logic now requires the successor to start the transfer before the predecessor clears its state.

### 📊 UI & Auditability Enhancements
- **Grouped History**: Inspection drawer now organizes processing logs by repository, providing a cleaner hierarchical view of multis-repo sessions.
- **Debug Simulator**: Exposed `window.PIPELINE_DEBUG` methods for manual verification of flow logic and server fault handling.

---

## [2.40.0] - SOLID Modularization & Deep Glass Aesthetics - 2026-01-19
### 🧱 Architectural Refactor: SOLID Pipeline Visualizer
Modularized the monolithic `PipelineCanvas.js` (>800 lines) into specialized, maintainable components:
- **PipelineConstants.js**: Centralized visual schema (Nodes, Connections, Event Mapping).
- **PipelineRenderer.js**: Dedicated canvas engine for high-fidelity drawing and particles.
- **PipelineInteraction.js**: Isolated mouse tracking, coordinate transformation, and panning logic.
- **PipelineUI.js**: Encapsulated inspection drawer and DOM-related interactions.
- **PipelineCanvas.js (Orchestrator)**: Lightweight controller that synchronizes data and modules.

### 🎨 Aesthetic Overhaul: Soft Emerald Deep Glass
Implemented a high-end, immersive visual theme for the entire Tracer UI:
- **Deep Glass Effect**: Globalized fixed liquid background with `backdrop-filter: blur(60px)` on all UI panels.
- **Soft Emerald Palette**: Transitioned to a monochrome green liquid background (Lime, Emerald, Sea) with reduced brightness for better contrast.
- **Premium Controls**: Redesigned pipeline buttons (Play/Pause/Step) as glassmorphism pieces with vibrant glowing hover states.

### 🔧 Fixes & Optimizations
- **Initialization Robustness**: Resolved `TypeError` in `PipelineCanvas` event subscription and added fallback for zero-width initialization.
- **Live Sync**: Fixed event property mapping (`type`/`payload`) to ensure real-time telemetry accuracy in the visualizer.

---

## [2.39.0] - Canvas Pipeline Flow Visualizer - 2026-01-19
### 🎨 New Feature: Flow-Based Canvas Debugger
Replaced DOM-based assembly lanes with a high-performance **Canvas-based** logical flow visualizer:
- **Logical Agent View**: Visualizes agents/stages (Workers, Streaming, Compaction, Mappers, DNA Synth, **Intelligence**) instead of server slots.
- **Functional Integration**: Real Play/Pause/Step support. Pauses workers, downloads, and background processing instantly.
- **Inspection Drawer**: Click any node to see its real-time processing history, statistics, and current state.
- **Particle System**: Success (Green) and Error (Red) particles flow between nodes to represent data transit.
- **Responsive Canvas**: Auto-scales to window size while maintaining high-DPI rendering.

### 📦 New Files Created
- `PipelineCanvas.js` - Main animation, rendering, and inspection engine.
- `debugger-canvas.css` - Styles for the canvas, header, and inspection drawer.

### 🔧 Modified Files
- `WorkerHealthMonitor.js`, `FileAuditor.js`, `BackgroundProcessor.js` - Integrated `PipelineController` for synchronized pausing.
- `tracer.html` - Swapped lane debugger for canvas wrapper.
- `TracerView.js` - Migrated initialization and toggle logic to use `PipelineCanvas`.

---

## [2.38.0] - Pipeline Debugger Visualizer - 2026-01-19
### 🎮 New Feature: Assembly Line Debugger
Visual "assembly line" debugger for the AI pipeline with Play/Pause/Step controls:
- **3 Visual Lanes**: GPU Workers (8000), Mappers (8002), Embeddings (8001)
- **Real-Time Slot Display**: See which slots are processing
- **Play/Pause/Step**: Control execution flow for debugging
- **Event Buffer**: Accumulates pipeline events for visualization
- **Toggle Button**: Show/hide debugger panel in tracer

### 📦 New Files Created
**JS Services** (`src/renderer/js/services/pipeline/`):
- `PipelineController.js` - Play/Pause/Step state management
- `EventQueueBuffer.js` - Pipeline event accumulator

**JS View** (`src/renderer/js/views/`):
- `DebugPipelineView.js` - Visual debugger component

**CSS Modules** (`src/renderer/style/debugger/`):
- `index.css` - Entry point with imports
- `debugger-base.css` - Layout, controls, state indicators
- `debugger-lanes.css` - Assembly line lanes
- `debugger-items.css` - Queue items and animations

### 🔧 Modified Files
- `tracer.html` - Added debugger section with toggle button
- `TracerView.js` - Integrated DebugPipelineView initialization

---

## [2.37.0] - Real-Time Fleet Telemetry & CSS Modularization - 2026-01-19
### ⚡ Real-Time Fleet Response
- **Removed 3-Second Sticky Delay**: Slots now turn off **immediately** when the server reports idle or when `:end` events are received.
- **True Real-Time UI**: No more artificial visual persistence - what you see is the actual server state.
- **Stale Tracking Cleanup**: Replaced `cleanExpiredSlots()` with `cleanStaleEventTracking()` - only resets slots stuck for >30 seconds (edge case protection).

### 🐛 Bug Fixes
- **Missing IPC Handler**: Added `cache:get-repo-golden-knowledge` handler that was causing blueprint synthesis to fail with "No handler registered" error.
- **Progress Bar Fix**: Progress now calculates percentage from actual `stats.analyzed / stats.totalFiles` instead of unreliable event percent.
- **Dynamic Status Messages**: Replaced static "Waiting for engine initialization..." with dynamic phase-based messages (Scanning, Analyzing, Curating, Synthesizing).

### 🎨 Tracer UX Improvements
- **Premium Glassmorphism**: Applied frosted glass effect to all tracer panels with subtle green/blue accents.
- **Panel Visual Hierarchy**: Config panel (green), Fleet panel (blue), Status panel (neutral) for clear visual distinction.
- **Worker Status Box**: New styled container for real-time worker feedback.

### 🎨 CSS Architecture Modularization
- **New Directory Structure**: Created `style/pages/` for page-specific CSS.
- **Moved**: `css/monitoring.css` → `style/pages/monitoring.css`.
- **New Component**: Created `style/components/fleet.css` with shared fleet panel styles (slot dots, status badges, animations).
- **Reduced Duplication**: Removed ~140 lines of duplicate inline CSS from `tracer.html`.

### 📁 File Structure After Modularization
```
src/renderer/style/
├── base.css              (reset & variables)
├── auth.css              (login page)
├── dashboard.css         (main layout)
├── design_system.css     (tokens)
├── pages/
│   └── monitoring.css    (monitoring & tracer base styles)
└── components/
    ├── chat.css
    ├── widgets.css
    ├── progress.css
    ├── sidebar.css
    └── fleet.css         (NEW - reusable fleet panel)
```

---

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

---

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

---

## [2.34.0] - Final Validation and Tracer Stabilization - 2026-01-18
### 🛡️ AI Infrastructure Stabilization
- **Definitive Port Configuration**: Tracer environment ports aligned with the user's real infrastructure (8000 Brain GPU, 8001 Embeddings, 8002 Mappers CPU).
- **Crash Prevention (Throttling)**: Implemented "Exponential Backoff" in `AIClient` and dynamic worker adjustment to prevent `llama.cpp` server saturation (`GGML_ASSERT` error).
- **Type Robustness**: Defensive correction in `InsightsCurator.js` to avoid collapses when iterating over null data structures (`forEach` error).
- **Dependency Injection**: Resolved circular dependency in `MemoryManager` by correctly injecting `EmbeddingService` during Tracer startup.

### 🧹 Cleanup
- **Log Silence**: Removed redundant and annoying debugging logs in `IntentOrchestrator` and `ChatPromptBuilder`.

---

## [2.33.0] - SOLID Audit & Technical Polish - 2026-01-18
### 🛡️ System Audit & SOLID Compliance
- **FileAuditor**: Delegated file filtering logic to specialized `FileFilter.js` module.
- **SynthesisOrchestrator**: Centralized all curation logic by delegating to `InsightsCurator.js`.
- **StreamingHandler**: Decoupled evidence storage (`EvidenceStore.js`) and curation logic.
- **InsightsCurator**: Implemented centralized traceability map fusion (DRY) to eliminate redundant logic.

### 🚀 Resilience & Performance
- **AI Circuit Breaker**: Implemented failure detection in `AIClient.js`. The system now pauses automated attempts for 60s after 3 consecutive errors, preventing session degradation during AI server outages.
- **File Tree Filtering**: Introduced draconian assets policy and smart toxic token detection via `FileFilter.js`.

### 🧹 Cleanup
- Eliminated internal method nesting and syntax inconsistencies in curators.
- Purged temporary diagnostic logs and forensic traces.

---

## [2.32.0] - SOLID Refactoring & Deep Modularization - 2026-01-18
### 🏗️ Architectural Overhaul (SOLID)
- **AI Intelligence Layer**: Decoupled `aiService.js` into `ContextManager`, `AIClient`, and `IntentOrchestrator`. Implemented Facade pattern for backward compatibility.
- **Analysis Pipeline**: Modularized `profileAnalyzer.js` into `AnalysisPipeline` (orchestration) and `BatchProcessor` (worker handling/normalization).
- **Curation & Streaming Layer**: Refactored `deepCurator.js` and `StreamingHandler.js` by extracting `EvolutionState`, `EvidenceStore`, and `InsightGenerator`.
- **Ghost Object Protocol**: Centralized data normalization in `BatchProcessor` to ensure findings integrity during worker-to-memory transitions.

### 🔧 Fixes & Refinement
- **DeepCurator Facade Fix**: Restored "live" access to `accumulatedFindings` and corrected `_buildStreamingContext` delegation.
- **Dependency Inversion**: Implemented injection-ready sub-modules across all core services.

---

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

---

## [2.30.0] - Evolution Ticks & System Visibility - 2026-01-18
### 🏁 System Load Visibility
- **Evolution Ticks**: Implemented internal counters for Compactions, Blueprints, and Global Refinements.
- **Chat Awareness**: Injected real-time system load into the chat context so the IA knows its own evolution progress.
- **Port Isolation**: Verified total separation between Chat (8000) and Identity Curation (8002) to ensure zero lag.
