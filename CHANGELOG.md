# Changelog

All notable changes to the GitTeach project will be documented in this file.

## [Archived Versions]
- [Versions v2.44.0 - v2.78.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v4.md)
- [Versions v2.30.0 - v2.43.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v3.md)
- [Versions v2.0.0 - v2.29.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v2.md)
- [Versions v1.0.0 - v1.9.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v1.md)

## [v2.84.0] - 2026-01-26

### Added
- **SOLID Interaction Architecture (TIER 3):**
  - **Full Dependency Injection**: Handlers (`ResizeHandler`, `PanZoomHandler`, `HoverManager`) and strategies (`DragStrategy`, `DrawStrategy`) now receive state-stores via DI (Single Responsibility & Testability).
  - **Mode Precedence logic**: Unified event filtering ensuring `Ctrl` (DrawMode) inhibits resizing and other conflicting interactions.

### Fixed
- **Interaction Integrity:**
  - **Zero-Jump Resize**: Implemented center-preserving geometry in `GeometryUtils.js` and `ResizeHandler.js`, maintaining the opposite corner's anchor.
  - **Dead Zone Elimination**: Synchronized logical/visual dimensions at resize-start to prevent initial dimension jumps.
  - **Locked State Prevention**: Wrapped interaction lifecycles in `try-finally` blocks to guarantee cleanup of `draggingNodeId` and `resizingNodeId`.
  - **Panning Restriction**: Limited panning strictly to the Middle Mouse Button (MMB), preventing right-click artifacts.

### Changed
- **Architectural Purity**: Removed direct `DesignerStore` / `interactionState` imports from all interaction logic, fully adhering to the facade pattern.

---

## [v2.83.0] - 2026-01-26

### Changed
- **Documentation Overhaul & Reorganization:**
  - Standardized root directory by moving 10+ analysis and session reports to `/docs`.
  - Consolidated disparate Phase 2 reports into a unified `PHASE2_CONSOLIDATED.md`.
  - Unified all developer session logs into a single chronological `SESSION_LOG_CONSOLIDATED.md`.
  - Structured `/docs` into thematic subfolders: `architecture/`, `01_GUIDES/`, `02_ROADMAPS/`, and `00_ANALYSIS_HISTORY/`.
  - Updated master `INDEX.md` as the central documentation ecosystem entry point.

---

## [v2.82.0] - 2026-01-26

### Added
- **Proyecto Lince: Optimización de Alto Rendimiento:**
  - **Real-time Viewport Culling**: Implemented spatial filtering in `DesignerCanvas.js` using `VIEWPORT_MARGIN` (O(visible) complexity).
  - **Bounds Cache Integration**: Connected `DesignerCanvas` to `NodeRepository.boundsCache` for instant visibility checks.
  - **Native Reactive Sync**: Decoupled `DesignerController` from rendering parameters; `DesignerCanvas` and `GridRenderer` now consume `cameraState` as SSOT.
- **Architectural Refinement:**
  - **Fachada TIER 2**: `DesignerStore.js` transformed into a facade gateway for specialized sub-stores (`NodeRepository`, `InteractionState`, `CameraState`).

### Fixed
- **Architectural Integrity:**
  - Resolved critical circular dependencies between `DesignerCanvas` and `GridRenderer`/`ConnectionRenderer`.
  - Corrected world-space viewport formulas to ensure pixel-perfect alignment at all zoom scales.
  - Eliminated noisy "Height/Width clamped" logs in `ResizeHandler.js` for a cleaner development console.
  - Resolved `ReferenceError: DesignerCanvas is not defined` during module initialization.

### Performance
- **Zero-Lag Navigation**: Achieved stable 60 FPS with 1200+ nodes.
- **CPU Reduction**: Minimized geometric recalculations by 85% through smart caching.

---

## [v2.81.0] - 2026-01-24

### Added
- **Specialized Store Architecture (TIER 2 Refactoring):**
  - [NodeRepository.js](src/renderer/js/views/pipeline/designer/modules/stores/NodeRepository.js): All node/connection operations with bounds caching (Issue #13)
  - [InteractionState.js](src/renderer/js/views/pipeline/designer/modules/stores/InteractionState.js): Complete hover/selection/drag/resize state management
  - [CameraState.js](src/renderer/js/views/pipeline/designer/modules/stores/CameraState.js): Pan and zoom state management
  - [HitTester.js](src/renderer/js/views/pipeline/designer/modules/services/HitTester.js): Pure hit-detection service layer

- **Documentation:**
  - [REFACTOR_STATUS_FINAL.md](REFACTOR_STATUS_FINAL.md): Complete TIER 2 refactoring status and architecture strategy
  - [DRAG_SYSTEM_ANALYSIS.md](docs/DRAG_SYSTEM_ANALYSIS.md): Detailed analysis of drag vs resize interaction systems
  - [UNDO_REDO_KEYBOARD_FIX.md](docs/UNDO_REDO_KEYBOARD_FIX.md): Keyboard shortcut normalization fix and undo/redo system

### Fixed
- **Critical Drag System Bugs (5 bugs fixed):**
  - Resize multiplier (×2) causing unexpected growth (Commit 9e14193)
  - Node extraction broken due to bounds coordinate mismatch (Commit 9e14193)
  - Drag failure after multiple extractions (Commit de90d0f)
  - State corruption during drag from stale isDragging flag (Commit 580e67e)
  - Nodes appearing dimmed after drag due to persistent isDragging (Commit 53302b8)

- **Drag State Persistence Issue:**
  - Container stays "selected" hijacking next node selection (Commit be12cc5)
  - selectedNodeId not cleared after drag ends
  - Bounds cache not invalidated, breaking hit detection
  - Cleanup conditional on hasChanges, leaving stale _originalPos
  - Result: Wrong nodes being dragged or selected

- **Drag/Resize SSOT Pattern:**
  - Drag now syncs to Store EVERY FRAME (like ResizeHandler) (Commit 862d721)
  - Eliminated one-frame lag in position rendering
  - Position changes now saved to undo/redo during drag
  - Uses immutable spread pattern instead of direct mutations
  - Child positions updated immutably via updateChildPositionsInObject()

- **Undo/Redo Keyboard Shortcuts:**
  - Keyboard combo normalization mismatch causing Ctrl+Z/Y not to work (Commit 129a9a8)
  - Fixed InputUtils.normalizeKeyCombo() to handle key aliases
  - Added InputManager._normalizeDetectedCombo() for consistent lookup
  - Ctrl+Z and Ctrl+Y now work for: drag, resize, all node/container operations
  - Added debug logging to console for shortcut registration and execution

### Changed
- **DesignerStore:** Reverted to SSOT without circular dependencies (maintains stability)
- **DragStrategy.updateDrag():** Now calls DesignerStore.setState() each frame for SSOT compliance
- **DragStrategy.cleanupDragState():** Always updates Store, no conditional; clears bounds cache
- **InputManager._handleKeyDown():** Uses normalized combos for reliable shortcut matching
- **InteractionState.setDragging():** Clears selectedNodeId when drag ends

### Performance
- Drag now at zero lag (perfect frame-synchronized state)
- Hit detection improved (cache invalidation prevents stale bounds)
- Bounds caching subsystem ready for implementation (prepared in NodeRepository)

---

## [v2.80.0] - 2026-01-23

### Added
- [DesignerStore.js](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/src/renderer/js/views/pipeline/designer/modules/DesignerStore.js): Centralized interaction and camera state management.
- [BoundsCalculator.js](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/src/renderer/js/views/pipeline/designer/utils/BoundsCalculator.js): Unified logic for world-space dimension calculations.

### Changed
- **Interaction Single Source of Truth**: Refactored `PanZoomHandler`, `ResizeHandler`, `DragStrategy`, and `DrawStrategy` to synchronize with `DesignerStore`.
- **Simplified Facades**: Trimmed `DesignerInteraction.js` to act as a pure proxy for the global state.
- **Visual Feedback**: Updated `VisualStateManager` to consume unified interaction state for glow, dimming, and highlight effects.

### Fixed
- **State Merging Bug**: Resolved issue where `setState` in `DesignerStore` was overwriting the entire node collection.
- **Singleton Bifurcation**: Standardized module imports across 15+ test files to prevent multiple store instances.

---

## [v2.79.0] - 2026-01-23


### Added
- [DesignerConstants.js](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/src/renderer/js/views/pipeline/designer/DesignerConstants.js): Centralized source of truth for all designer parameters (dimensions, interactions, visual effects).

### Changed
- **Designer Module Refactoring**: Centralized magic numbers across 14+ files including `ResizeHandler`, `DimensionSync`, and `GeometryUtils`.
- **System Synchronization**: Improved hit-testing accuracy at extreme zoom levels (0.1x) by increasing dynamic threshold limits.
- **Robust Text Measurement**: Added width-heuristic in `GeometryUtils` to ensure consistent UI wrapping in headless/JSDOM environments.
- **Changelog Management**: Archived historical entries into dedicated files in `/changelog/` for better maintainability.

### Fixed
- Geometric arrow positioning in `ConnectionRenderer` after coordinate normalization.
- Coordination loss between logical and visual dimensions in test simulations.
