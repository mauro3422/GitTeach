# 📐 Plan de Refactorización: Dividir DesignerStore en 3 Stores

**Status:** Plan de arquitectura (no implementado aún)
**Prioridad:** TIER 2 (hacer después de EventEmitter)
**Impacto:** Reduce acoplamiento, mejora testability
**Esfuerzo Estimado:** 2-3 días (refactor completo + tests)

---

## ¿POR QUÉ?

**Problema Actual:**
- DesignerStore tiene 30+ métodos
- 19+ archivos dependen de él
- Responsabilidades mezcladas (state + history + queries + caching)
- Imposible testear componentes aisladamente

**Solución:**
- Separar en stores especializados
- Cada store: 1 responsabilidad
- Reducir dependencias de 30 a 5-7 métodos por store
- Mejor testability y extensibilidad

---

## ARQUITECTURA DESTINO

```
DesignerStore (Main - Orchestrator)
├── NodeRepository (New)
│   └── Nodes + Dimensions + Validation
├── InteractionState (New)
│   └── Hover, Selection, Drag, Resize, Draw
├── CameraState (Move from current)
│   └── Pan, Zoom
└── HitTester (New)
    └── findNodeAt, findConnectionAt
```

---

## 1. NODEREPOSITORY (New Store)

**Responsabilidad:** Gestionar todos los nodos y sus dimensiones

### Methods to Move/Extract:

```javascript
// From DesignerStore to NodeRepository

// Queries
getNode(id) → NodeRepository.getNode(id)
getAllNodes() → NodeRepository.getAllNodes()
getChildren(parentId) → NodeRepository.getChildren(parentId)
getConnection(id) → NodeRepository.getConnection(id)
getAllConnections() → NodeRepository.getAllConnections()

// Mutations
addNode(options) → NodeRepository.addNode(options)
updateNode(id, updates) → NodeRepository.updateNode(id, updates)
removeNode(id) → NodeRepository.removeNode(id)
addConnection(from, to) → NodeRepository.addConnection(from, to)
removeConnection(id) → NodeRepository.removeConnection(id)
setConnections(connections) → NodeRepository.setConnections(connections)

// Caching (stays with nodes)
getCachedBounds(nodeId, zoom) → NodeRepository.getCachedBounds(nodeId, zoom)
invalidateBoundsCache(nodeId) → NodeRepository.invalidateBoundsCache(nodeId)
clearBoundsCache() → NodeRepository.clearBoundsCache()

// History integration (delegates to HistoryManager)
savepoint(action, data) → NodeRepository.savepoint(action, data)
undo() → NodeRepository.undo()
redo() → NodeRepository.redo()
```

### File Structure:

```javascript
// File: modules/stores/NodeRepository.js

export class NodeRepository extends Store {
    constructor() {
        super({
            nodes: {},
            connections: []
        });
        this.boundsCache = {};
    }

    // Queries...
    getNode(id) { ... }
    getAllNodes() { ... }

    // Mutations...
    addNode(options) { ... }
    updateNode(id, updates) { ... }

    // Caching...
    getCachedBounds(nodeId, zoom) { ... }
}

export const nodeRepository = new NodeRepository();
```

---

## 2. INTERACTIONSTATE (New Store)

**Responsabilidad:** Gestionar estado de interacción del usuario

### Methods to Move:

```javascript
// From DesignerStore to InteractionState

// Hover
setHover(nodeId) → InteractionState.setHover(nodeId)
getHoveredNodeId() → InteractionState.getHoveredNodeId()

// Selection
selectNode(id) → InteractionState.selectNode(id)
getSelectedNodeId() → InteractionState.getSelectedNodeId()
clearSelection() → InteractionState.clearSelection()
selectConnection(id) → InteractionState.selectConnection(id)

// Dragging
setDragging(nodeId) → InteractionState.setDragging(nodeId)
isDragging() → InteractionState.isDragging()

// Resizing
startResize(nodeId, state) → InteractionState.startResize(nodeId, state)
clearResize() → InteractionState.clearResize()
isResizing() → InteractionState.isResizing()

// Drawing
setDrawing(sourceId) → InteractionState.setDrawing(sourceId)
isDrawing() → InteractionState.isDrawing()
```

### File Structure:

```javascript
// File: modules/stores/InteractionState.js

export class InteractionState extends Store {
    constructor() {
        super({
            hoveredNodeId: null,
            selectedNodeId: null,
            selectedConnectionId: null,
            draggingNodeId: null,
            resizingNodeId: null,
            activeMode: 'IDLE',
            resize: { corner: null, ... }
        });
    }

    setHover(nodeId) { ... }
    selectNode(id) { ... }
    setDragging(nodeId) { ... }
}

export const interactionState = new InteractionState();
```

---

## 3. CAMERASTATE (Move from current)

**Responsabilidad:** Gestionar pan, zoom, viewport

### Methods to Keep/Move:

```javascript
// From DesignerStore camera state to CameraState

setCamera(updates) → CameraState.setCamera(updates)
getCamera() → CameraState.getCamera()
getPan() → CameraState.getPan()
getZoom() → CameraState.getZoom()
```

### File Structure:

```javascript
// File: modules/stores/CameraState.js

export class CameraState extends Store {
    constructor() {
        super({
            panOffset: { x: 0, y: 0 },
            zoomScale: 1.0,
            isPanning: false
        });
    }

    setCamera(updates) { ... }
    getPan() { ... }
    getZoom() { ... }
}

export const cameraState = new CameraState();
```

---

## 4. HITTESTER (New Service)

**Responsabilidad:** Hit detection queries (no state)

### Methods to Extract:

```javascript
// From DesignerStore to HitTester

findNodeAt(position, nodes, zoom) → HitTester.findNodeAt(...)
findConnectionAt(position, nodes) → HitTester.findConnectionAt(...)
findDropTarget(position, nodes) → HitTester.findDropTarget(...)
```

### File Structure:

```javascript
// File: modules/services/HitTester.js

export const HitTester = {
    findNodeAt(position, nodes, zoom) {
        // Uses GeometryUtils, no Store dependency
    },

    findConnectionAt(position, nodes) {
        // Pure function
    }
};
```

---

## 5. DESIGNER STORE (Refactored - Thin Orchestrator)

**Nueva Responsabilidad:** Solo orchestrate las 3 stores + backward compatibility

### New Implementation:

```javascript
// File: modules/DesignerStore.js (refactored)

import { nodeRepository } from './stores/NodeRepository.js';
import { interactionState } from './stores/InteractionState.js';
import { cameraState } from './stores/CameraState.js';
import { HitTester } from './services/HitTester.js';

class DesignerStoreClass {
    // Delegates to repositories

    // Node operations
    getNode(id) { return nodeRepository.getNode(id); }
    addNode(opts) { return nodeRepository.addNode(opts); }
    updateNode(id, updates) { return nodeRepository.updateNode(id, updates); }

    // Interaction operations
    selectNode(id) { return interactionState.selectNode(id); }
    setHover(id) { return interactionState.setHover(id); }
    setDragging(id) { return interactionState.setDragging(id); }

    // Camera operations
    setCamera(updates) { return cameraState.setCamera(updates); }

    // Hit testing
    findNodeAt(pos, nodes, zoom) { return HitTester.findNodeAt(pos, nodes, zoom); }

    // Backward compatibility
    get state() {
        return {
            nodes: nodeRepository.state.nodes,
            connections: nodeRepository.state.connections,
            interaction: interactionState.state,
            camera: cameraState.state
        };
    }

    // Subscriber pattern (unified)
    subscribe(callback) {
        nodeRepository.subscribe(callback);
        interactionState.subscribe(callback);
        cameraState.subscribe(callback);
    }
}

export const DesignerStore = new DesignerStoreClass();
```

---

## MIGRATION PATH

### Phase 1: Create New Stores (No Breaking Changes)
```
1. Create NodeRepository.js
2. Create InteractionState.js
3. Create CameraState.js
4. Create HitTester.js
5. Commit: "feat: create new specialized stores (not used yet)"
```

### Phase 2: Migrate Each Module
```
For each file that uses DesignerStore:

OLD:
import { DesignerStore } from './DesignerStore.js';
DesignerStore.getNode(id);
DesignerStore.setHover(id);

NEW:
import { nodeRepository } from './stores/NodeRepository.js';
import { interactionState } from './stores/InteractionState.js';
nodeRepository.getNode(id);
interactionState.setHover(id);
```

### Phase 3: Update DesignerStore (Thin Wrapper)
```
1. Remove implementations from DesignerStore
2. Add delegation methods
3. Maintain backward compatibility layer
4. Commit: "refactor: thin DesignerStore, use specialized stores"
```

### Phase 4: Remove Backward Compat (Optional Future)
```
When all modules migrated:
1. Delete delegation methods
2. Force direct store imports
3. Cleaner final result
```

---

## DEPENDENCY REDUCTION

### Before:
```
19 files import DesignerStore
All 19 files depend on ALL methods (30+)
High coupling, hard to test
```

### After:
```
Node queries only:
  - NodeRenderer → NodeRepository (5 methods)
  - DragSelectionManager → NodeRepository (2 methods)

Interaction only:
  - ResizeHandler → InteractionState (3 methods)
  - HoverManager → InteractionState (2 methods)

Camera only:
  - PanZoomHandler → CameraState (2 methods)
  - DesignerCanvas → CameraState (1 method)

Result: Each file imports only what it needs!
```

---

## TESTING IMPROVEMENTS

### Before:
```javascript
// Impossible to test DragSelectionManager alone
// Because it needs full DesignerStore (30 dependencies)
import { DesignerStore } from '...';

test('hitTest', () => {
    // Must initialize 19 other systems just to test hit-testing!
});
```

### After:
```javascript
// Easy to test DragSelectionManager
// Because it only needs NodeRepository
import { NodeRepository } from '...';

test('hitTest', () => {
    const repo = new NodeRepository();
    repo.addNode({ ... });
    // Test in isolation! ✓
});
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Create NodeRepository.js
- [ ] Create InteractionState.js
- [ ] Move camera state to CameraState.js
- [ ] Create HitTester.js service
- [ ] Refactor DesignerStore to thin wrapper
- [ ] Update imports in all 19 files
- [ ] Run tests (should all pass)
- [ ] Performance benchmark (should be same)
- [ ] Update documentation

---

## ESTIMATED EFFORT

```
NodeRepository:     4-6 hours (extract methods, tests)
InteractionState:   2-3 hours (simpler methods)
CameraState:        1-2 hours (small store)
HitTester:          1 hour (pure functions)
Refactor DesignerStore: 2-3 hours (delegation, compat)
Update imports (19 files): 4-5 hours (systematic)
Testing & debugging: 2-3 hours
Docs update: 1-2 hours
─────────────────────────────
TOTAL:              17-25 hours (2-3 days)
```

---

## RISK ASSESSMENT

### Low Risk Areas:
✅ NodeRepository (purely extract existing methods)
✅ CameraState (self-contained, only pan/zoom)
✅ HitTester (pure functions, no state)

### Medium Risk Areas:
⚠️ InteractionState (validation logic, mode exclusivity)
⚠️ Backward compatibility layer (must not break anything)

### Mitigation:
- Run full test suite after each phase
- Keep backward compatibility layer long-term
- Gradual migration (one module at a time)
- Performance profiling before/after

---

## BENEFITS

✅ Reduced coupling (19 dependencies → 3-5 each)
✅ Better testability (can test components in isolation)
✅ Clear responsibility separation
✅ Easier to add new stores (e.g., AnimationStore, UndoStore)
✅ Performance same or better (less method lookup overhead)
✅ Documentation clearer (each store documented separately)

---

## NEXT STEPS

1. **Short term:** Implement EventBus (done ✓)
2. **Medium term:** Create new stores (this plan)
3. **Long term:** Full DI container + abstraction interfaces

---

**Document:** REFACTOR_DESIGNER_STORE_PLAN.md
**Last Updated:** 2026-01-24
**Status:** Ready for implementation
