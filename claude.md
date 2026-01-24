# Giteach - Designer Canvas Project

## 🚨 CRÍTICO: Sistema de Alto Acoplamiento

Este proyecto tiene **interdependencias complejas**. Antes de modificar cualquier archivo, **SIEMPRE verifica los sistemas afectados** usando el skill `/check-impact`.

---

## Arquitectura del Designer Canvas

### Módulos Core (Altamente Acoplados)

1. **DesignerController** - Orquestador principal
   - Coordina rendering, interacción, estado
   - **Afecta**: TODO el sistema si se modifica

2. **DesignerStore** - Estado centralizado (singleton)
   - Nodes, connections, navigation, interaction
   - **Afecta**: Cualquier cosa que lea/escriba nodos

3. **DesignerInteraction** - Sistema de input
   - PanZoomHandler, ResizeHandler, StrategyManager
   - **Afecta**: Mouse/teclado, hit-testing, drag/resize

4. **GeometryUtils** - Cálculos de geometría
   - Hit detection, bounds, edge points
   - **Afecta**: Rendering, resizing, connections

5. **DesignerCanvas** - Sistema de renderizado
   - GridRenderer, ContainerRenderer, NodeRenderer, ConnectionRenderer
   - **Afecta**: Visualización completa

---

## ⚠️ Puntos de Fragilidad Conocidos

### 1. **Zoom/Scale Sincronización** (CRÍTICO)
**Archivos afectados:**
- `DesignerInteraction.js` (state.zoomScale)
- `DesignerStore.js` (navigation.zoomScale)
- `GeometryUtils.js` (usa zoomScale para cálculos)
- `ScalingCalculator.js` (convierte zoom → visual scale)

**Problema:** Zoom se trackea en DOS lugares. Si cambias uno, debes sincronizar el otro.

**Cómo evitar roturas:**
- NUNCA modificar `zoomScale` directamente
- Usar `PanZoomHandler.setZoom()` siempre
- Verificar que `DesignerController._executeRender()` sincroniza correctamente

---

### 2. **Dimensiones: Visual vs Lógico** (CRÍTICO)
**Archivos afectados:**
- `ResizeHandler.js` (usa dimensiones lógicas)
- `ContainerRenderer.js` (renderiza con visual bounds)
- `GeometryUtils.js` (calcula bounds según contexto)
- `InlineEditor.js` (debe alinearse con visual bounds)

**Problema:** Sticky notes y containers tienen:
- **Dimensiones lógicas**: `node.dimensions.{w, h}` (almacenadas)
- **Dimensiones visuales**: Infladas por texto/zoom para rendering

**Cómo evitar roturas:**
- Resize usa lógico (`dimensions.w/h`)
- Rendering usa visual (`GeometryUtils.getStickyNoteBounds()`)
- Hit-testing usa visual (para que coincida con lo que ve el usuario)
- NUNCA mezclar los dos en el mismo cálculo

---

### 3. **Race Conditions en Estado** (ALTO RIESGO)
**Archivos afectados:**
- `PipelineStatusHandlers.js` (setTimeout mutations)
- `DynamicSlotManager.js` (counter no-atómico)
- `BlueprintManager.js` (async save + sync localStorage)

**Problema:** Mutaciones asíncronas sin coordinación:
```javascript
setTimeout(() => {
  stats.isDispatching = false; // Puede ejecutarse después de que el nodo fue eliminado
}, 300);
```

**Cómo evitar roturas:**
- Validar que el objeto existe antes de mutar en setTimeout
- Usar promesas en lugar de setTimeout cuando sea posible
- Considerar cola de transiciones de estado

---

### 4. **Command Pattern vs Direct Mutation** (MEDIO RIESGO)
**Archivos afectados:**
- `DesignerStore.js` (métodos updateNode, deleteNode)
- `commands/*.js` (AddNodeCommand, DeleteNodeCommand, etc.)
- `HistoryManager.js` (undo/redo)

**Problema:** Hay DOS formas de cambiar estado:
- Commands (reversible, con historial)
- Direct calls a DesignerStore (NO reversible)

**Cómo evitar roturas:**
- Cambios de UI usuario → usar Commands
- Cambios programáticos internos → puede usar direct
- NUNCA mezclar ambos en la misma operación

---

### 5. **Hit-Testing Priority Hierarchy** (MEDIO RIESGO)
**Archivos afectados:**
- `DesignerInteraction.js:handleMouseDown` (prioridad de checks)
- `ResizeHandler.js` (checkResize)
- `DesignerStore.js` (findNodeAt, findConnectionAt)

**Problema:** El orden de checks importa:
1. Resize handles (PRIMERO - nodo seleccionado tiene prioridad)
2. Pan triggers (Ctrl/Shift)
3. Node hits
4. Strategy manager

**Cómo evitar roturas:**
- Mantener el orden en `handleMouseDown`
- No añadir checks sin considerar prioridad
- Selected node SIEMPRE tiene prioridad en resize

---

### 6. **Camera State Synchronization** (✅ RESOLVED in Phase 1)
**Archivos afectados:**
- `DesignerStore.js` (state.camera.{panOffset, zoomScale})
- `PanZoomHandler.js` (sincroniza a través de setCamera())
- `DesignerInteraction.js` (lee desde DesignerStore como SSOT)

**Status:** ✅ ALREADY SYNCHRONIZED
All mutations in PanZoomHandler call `DesignerStore.setCamera()` immediately after changes.

**Architecture:**
```
PanZoomHandler.state (local)
  ↓ (mutate)
DesignerStore.setCamera()
  ↓ (update)
DesignerStore.state.camera (SSOT)
  ↓ (read)
DesignerInteraction.state (via getter)
  ↓ (read)
GeometryUtils, ResizeHandler, etc.
```

**How It Works:**
1. PanZoomHandler modifies local state: `this.state.zoomScale = newZoom`
2. Immediately calls: `DesignerStore.setCamera({ zoomScale: this.state.zoomScale })`
3. DesignerStore updates: `state.camera.zoomScale`
4. Subscribers notified, renders trigger
5. All readers get value from DesignerStore (SSOT)

**Pattern (Correct):**
```javascript
// PanZoomHandler.js
setZoom(newZoom) {
    this.state.zoomScale = newZoom;
    // SYNC: Update Store immediately
    DesignerStore.setCamera({
        zoomScale: this.state.zoomScale
    });
}

// DesignerInteraction.js (getter)
get state() { return DesignerStore.state.camera; }

// Readers always see consistent state ✅
```

**Verification:**
```javascript
// ✅ CORRECT - Already implemented
DesignerStore.setCamera({
    panOffset: { x, y },
    zoomScale: zoom
});
// All readers automatically get updated value
```

**Why No Bug:**
- All PanZoomHandler mutations call setCamera()
- DesignerInteraction.state returns DesignerStore.state.camera
- No direct assignment without sync
- Pattern is consistent throughout codebase

---

## 🔍 Mapa de Dependencias Críticas

### Si modificas `GeometryUtils.js`:
**Archivos que se romperán:**
- `ResizeHandler.js` (usa getNodeRadius, getContainerBounds)
- `ContainerRenderer.js` (usa getStickyNoteBounds)
- `ConnectionRenderer.js` (usa getEdgePoint)
- `DesignerStore.js` (usa isPointInRectangle para hit-testing)
- `HoverManager.js` (usa findNodeAt)

**Tests a correr:**
- `tests_real/resize_accuracy.test.js`
- `tests_real/container_hit_test.test.js`
- `tests_real/edge_contract.test.js`

---

### Si modificas `DesignerStore.js`:
**Archivos que se romperán:**
- TODO lo que lee nodos/connections
- `DesignerController.js` (subscribe a cambios)
- `BlueprintManager.js` (persiste el estado)
- Todos los Commands
- `HistoryManager.js` (undo/redo)

**Tests a correr:**
- `tests/commands.test.js`
- `tests_real/interaction_integrity.test.js`

---

### Si modificas `ResizeHandler.js`:
**Archivos que se romperán:**
- `DesignerInteraction.js` (llama a checkResize)
- `InlineEditor.js` (alineación puede desincronizarse)
- `ContainerRenderer.js` (si cambias cómo se calculan bounds)

**Tests a correr:**
- `tests_real/resize_accuracy.test.js`
- `tests_real/interaction_hijack.test.js`
- `tests_real/sticky_note_resize_accuracy_fixed.test.js`

---

### Si modificas `DesignerInteraction.js`:
**Archivos que se romperán:**
- Todos los handlers (Resize, PanZoom, Hover)
- `StrategyManager.js` y strategies
- `DesignerController.js` (coordina eventos)

**Tests a correr:**
- `tests_real/interaction_integrity.test.js`
- `tests_real/interaction_hijack.test.js`
- `tests_real/camera_projection.test.js`

---

### Si modificas sistema de zoom/pan:
**Archivos que se romperán:**
- `GeometryUtils.js` (todos los cálculos)
- `ScalingCalculator.js` (conversiones)
- `ResizeHandler.js` (hit threshold)
- `InlineEditor.js` (posicionamiento)
- Todos los renderers

**Tests a correr:**
- `tests_real/resize_accuracy.test.js` (CRÍTICO - prueba 0.1x, 1.0x, 3.0x zoom)
- `tests_real/camera_projection.test.js`
- `tests_real/legibility_contract.test.js`

---

## 📋 Workflow Recomendado para Cambios

### Antes de modificar CUALQUIER archivo:

1. **Ejecutar skill `/check-impact <archivo>`**
   - Lista archivos afectados
   - Sugiere tests a correr
   - Alerta de race conditions

2. **Leer archivos relacionados**
   - No modificar código que no has leído
   - Entender dependencias antes de cambiar

3. **Verificar patrones existentes**
   - ¿Hay código similar en otro lugar?
   - ¿Usas dimensiones lógicas o visuales?
   - ¿Necesitas Command o direct mutation?

4. **Después de cambios:**
   - Correr tests relevantes
   - Verificar zoom levels (0.1x, 1.0x, 3.0x)
   - Probar resize + drag + pan manualmente

---

## 🎯 Convenciones de Código

### Estado
- **Inmutabilidad**: Siempre usar spread `{ ...state, ...updates }`
- **NO** mutar objetos retornados por Store queries
- **Validar** existencia en callbacks async (setTimeout)

### Geometría
- **Zoom-invariant**: Hit-testing debe funcionar en cualquier zoom
- **Visual vs Lógico**: Comentar qué tipo de dimensión usas
- **Coordinate spaces**: Documentar si es world o screen space

### Rendering
- **RAF batching**: Un render por frame máximo
- **Layer order**: Grid → Containers → Nodes → Connections → UI
- **Camera transform**: Wrappear renderers de mundo con `camera.apply()`

### Comandos
- **User actions**: Commands (reversible)
- **Programmatic**: Direct store calls
- **Validar** `canExecute()` antes de `execute()`

---

## 🛠️ Skills Disponibles

### `/check-impact <archivo>`
Analiza impacto de modificar un archivo. Lista:
- Archivos que dependen de él
- Sistemas afectados
- Tests recomendados
- Race conditions potenciales

### `/pre-commit`
Verifica antes de commit:
- Corre tests relevantes
- Valida que no hay console.logs
- Revisa que cambios siguen convenciones
- Sugiere mensaje de commit

### `/find-coupling <concepto>`
Busca todos los lugares donde se usa un concepto (ej: "zoomScale", "dimensions.w")

### `/audit-dimensions <archivo>`
Verifica uso correcto de dimensiones lógicas vs visuales en un archivo

### `/trace-zoom <componente>`
Traza el flujo completo de zoom desde input hasta el componente especificado

---

## 📚 Recursos

- Tests de alta fidelidad: `tests_real/`
- Documentación de arquitectura: Este archivo
- Commits recientes importantes:
  - `c7a6876` - Fix resize hijacking & container hit-testing
  - `b5d04f1` - Container standardization
  - `dcbc546` - SOLID architecture refactor
