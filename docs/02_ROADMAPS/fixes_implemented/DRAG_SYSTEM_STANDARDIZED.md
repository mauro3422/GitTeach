# ✅ Drag System - Standardized & Robust

## 🎯 Arquitectura Final

El sistema de drag está dividido en **3 capas claramente separadas**:

```
┌─────────────────────────────────────────────┐
│        DesignerInteraction (Orquestador)   │
│  - Recibe eventos del mouse                 │
│  - Delega a managers apropiados             │
│  - Coordina flujo de interacción            │
└────────────┬─────────────┬──────────────────┘
             │             │
    ┌────────▼─────┐   ┌───▼──────────────┐
    │ DragManager  │   │DragSelectionMgr  │
    │(SSOT)        │   │(SSOT)            │
    │- initiiateDrag   │- findNodeAtPos   │
    │- updateDrag      │- validateState   │
    │- completeDrag    │- helpers         │
    │- cancelDrag      │                  │
    └────────┬─────┘   └──────────────────┘
             │
    ┌────────▼──────────┐
    │  DesignerStore    │
    │  (State Singleton)│
    │ - nodes           │
    │ - interaction     │
    │ - connections     │
    └───────────────────┘
```

---

## 📋 Las Tres Capas

### 1. **DragSelectionManager** (Hit-Testing SSOT)
**Archivo**: `src/renderer/js/views/pipeline/designer/modules/DragSelectionManager.js`

**Responsabilidad**:
- Hit-testing preciso en todas las zoom levels
- Selección de nodos (no mutations de estado)
- Validación de estado

**Métodos Públicos**:
```javascript
findNodeAtPosition(nodeList, worldPos, zoomScale, excludeId)
  → Retorna: node or null

startInteraction(node, worldPos, actionType)
  → Selecciona nodo + inicia drag (si actionType='DRAG')

cancelInteraction()
  → Limpia selección y drag

validateState()
  → Auto-corrige inconsistencias
```

**Uso**:
```javascript
// Hit-testing
const node = DragSelectionManager.findNodeAtPosition(nodes, {x: 100, y: 100}, 1.0);

// Seleccionar
DragSelectionManager.startInteraction(node, worldPos, 'SELECT');
```

---

### 2. **DragManager** (Movement SSOT)
**Archivo**: `src/renderer/js/views/pipeline/designer/interaction/DragManager.js`

**Responsabilidad**:
- Movimiento del nodo durante drag
- Actualización de posiciones
- Completar drag (drop/unparenting)
- Cancelar drag

**Métodos Públicos**:
```javascript
initiiateDrag(node, worldPos)
  → Inicia drag (DESPUÉS de selectionar)
  → Retorna: boolean

updateDrag(worldPos, nodes)
  → Actualiza posición durante mouse move
  → Retorna: boolean

completeDrag(nodes)
  → Finaliza drag, maneja drop/unparenting
  → Retorna: boolean

cancelDrag(nodes)
  → Cancela drag, revierte a posición original
  → Retorna: boolean

validateDragState(nodes)
  → Auto-corrige, mantiene consistencia
  → Retorna: boolean

isActive()
  → Retorna: true si hay drag activo
```

**Uso**:
```javascript
// En DesignerInteraction.handleMouseDown
dragManager.initiiateDrag(clickedNode, worldPos);

// En DesignerInteraction.handleMouseMove
dragManager.updateDrag(worldPos, nodes);

// En DesignerInteraction.handleMouseUp
dragManager.completeDrag(nodes);

// En Escape key
dragManager.cancelDrag(nodes);
```

---

### 3. **DesignerStore** (State SSOT)
**Archivo**: `src/renderer/js/views/pipeline/designer/modules/DesignerStore.js`

**Responsabilidad**:
- Singleton de estado global
- Hit-testing delegation (delega a DragSelectionManager)
- Persistencia

**Métodos Relevantes**:
```javascript
selectNode(nodeId)
  → Selecciona en Store

setDragging(nodeId)
  → Marca como arrastrado (para rendering)

clearSelection()
  → Limpia selección

findNodeAt(worldPos, excludeId, zoomScale)
  → DELEGA a DragSelectionManager
```

---

## 🔄 Flujo Completo de Drag

```
handleMouseDown(e)
  ↓
HoverManager.findNodeAt(worldPos)
  → DragSelectionManager.findNodeAtPosition() [HIT-TEST]
  ↓
DesignerStore.selectNode(nodeId) [SELECT]
  ↓
DragManager.initiiateDrag(node, worldPos) [INIT DRAG]
  ↓
handleMouseMove(e)
  ↓
DragManager.updateDrag(worldPos, nodes) [UPDATE POSITION]
  ↓
Render actualiza con nuevas posiciones
  ↓
handleMouseUp(e) o Escape
  ↓
DragManager.completeDrag(nodes) [FINALIZE]
  ├─ Maneja drop target
  ├─ Maneja unparenting
  └─ Limpia estado
```

---

## 🛠️ Cómo Integrar en DesignerInteraction

```javascript
import { DragManager } from './DragManager.js';

export class DesignerInteraction {
    constructor(context) {
        this.dragManager = new DragManager(context);
        // ... otros inicios
    }

    handleMouseDown(e) {
        const worldPos = this.getWorldPosFromEvent(e);

        // 1. Resize check (priority)
        if (this.resizeHandler.checkResize(worldPos)) {
            this.resizeHandler.startResize(...);
            return;
        }

        // 2. Pan check
        if (e.ctrlKey || e.shiftKey) {
            this.panZoomHandler.start(e, ...);
            return;
        }

        // 3. Node selection/drag
        const clickedNode = this.hoverManager.findNodeAt(worldPos);
        if (clickedNode) {
            DesignerStore.savepoint('NODE_MOVE', { nodeId: clickedNode.id });
            DesignerStore.selectNode(clickedNode.id);

            // CRITICAL: Initiate drag
            this.dragManager.initiiateDrag(clickedNode, worldPos);
            return;
        }

        // 4. Connection check
        // ...
    }

    handleMouseMove(e) {
        // Drag update
        if (this.dragManager.isActive()) {
            const worldPos = this.getWorldPosFromEvent(e);
            this.dragManager.updateDrag(worldPos, DesignerStore.state.nodes);
            return;
        }

        // Hover update
        const worldPos = this.getWorldPosFromEvent(e);
        this.hoverManager.update(worldPos);

        // ... other move logic
    }

    handleMouseUp(e) {
        if (this.dragManager.isActive()) {
            this.dragManager.completeDrag(DesignerStore.state.nodes);
            return;
        }

        // ... other up logic
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.dragManager.isActive()) {
                this.dragManager.cancelDrag(DesignerStore.state.nodes);
                return;
            }
            // ... other escape logic
        }
    }
}
```

---

## 🧪 Debugging

### En Console:
```javascript
// Verificar info de drag
console.log(DesignerInteraction.dragManager.getDragInfo());

// Verificar si está activo
console.log(DesignerInteraction.dragManager.isActive());

// Verificar drop target
console.log(DesignerInteraction.dragManager.getDropTargetId());
```

---

## 🚀 Extender el Sistema (Sin Romper)

### Agregar validación personalizada
```javascript
// En DragManager.validateDragState():
if (!this.dragState.isActive) return true;

// AGREGAR TU LÓGICA AQUÍ sin tocar el resto
if (myCustomValidation) {
    this.dragState = {...};
}

return this.dragState.isActive;
```

### Agregar efectos visuales
```javascript
// En NodeRenderer o UIRenderer:
const dragInfo = dragManager.getDragInfo();
if (dragInfo.isActive) {
    // Renderizar preview de drop target
    // Renderizar líneas de conexión
    // etc.
}
```

### Agregar callbacks
```javascript
// En DesignerInteraction:
this.dragManager.onDragStart = (nodeId) => {
    // Custom logic
};

this.dragManager.onDragUpdate = (nodeId, newPos) => {
    // Custom logic
};

this.dragManager.onDragEnd = (nodeId, dropTargetId) => {
    // Custom logic
};
```

---

## ✅ Garantías del Sistema

1. ✅ **Sin circular dependencies** - window.DesignerStore para lazy access
2. ✅ **Hit-testing preciso** - DragSelectionManager SSOT
3. ✅ **Drag confiable** - DragManager SSOT para movimiento
4. ✅ **Auto-validación** - validateDragState() previene bugs
5. ✅ **Fácil extender** - Métodos públicos claros, privados para detalles
6. ✅ **Sin breaking changes** - Agregar métodos, no modificar existentes

---

## 🎯 Patrón Estandarizado

Este sistema sigue el mismo patrón que **ResizeHandler** y **TextScalingManager**:

```
┌─────────────────────────────────┐
│      SSOT Manager               │
├─────────────────────────────────┤
│ Responsabilidad única y clara   │
├─────────────────────────────────┤
│ Métodos públicos:               │
│  - initialize / start           │
│  - update / process             │
│  - complete / end               │
│  - cancel / abort               │
│  - validate / check             │
├─────────────────────────────────┤
│ Métodos privados:               │
│  - _helpers (sin exposición)    │
└─────────────────────────────────┘
```

**Beneficios**:
- Predecible
- Fácil de documentar
- Fácil de mantener
- Fácil de testear

---

## 📚 Archivos del Sistema

### Core
- `DragSelectionManager.js` - Hit-testing SSOT
- `DragManager.js` - Movement SSOT (NEW)
- `DesignerStore.js` - State SSOT

### Integration
- `DesignerInteraction.js` - Orquestador (integra DragManager)
- `UIRenderer.js` - Tooltips (desactivados durante drag)
- `NodeRenderer.js` - Visual feedback

### Related (NO TOCAR)
- `ResizeHandler.js` - Patron similar para resize
- `TextScalingManager.js` - Patron similar para text

---

## 🎉 Resultado Final

Sistema de drag **robusto, standardized, y listo para producción**.

Tres SSOT principales:
1. **ResizeHandler** - Resize system
2. **TextScalingManager** - Text system
3. **DragManager** - Drag system (NEW)

Todos siguen el mismo patrón, documentados, y listos para extender sin romper.

**Versión**: v2.80.2
**Status**: ✅ **READY FOR PRODUCTION**

