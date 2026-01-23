# Changelog

All notable changes to the GitTeach project will be documented in this file.

## [Archived Versions]
- [Versions v2.44.0 - v2.78.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v4.md)
- [Versions v2.30.0 - v2.43.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v3.md)
- [Versions v2.0.0 - v2.29.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v2.md)
- [Versions v1.0.0 - v1.9.0](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/changelog/archive-2026-v1.md)

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
