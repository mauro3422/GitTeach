# 🏗️ Plan de Robustez - Sistema de Resize Unificado

## 🎯 Objetivo

Crear un sistema de resize **robusto, unificado y expansible** que:
1. Nunca se rompa con nuevas implementaciones
2. Tenga una única fuente de verdad (Single Source of Truth)
3. Sea fácil de debuggear y mantener
4. Soporte futuros tipos de interacción sin conflictos

---

## 🔴 Problemas Actuales (Por qué se rompió)

### 1. **Estado Dual - Desincronización**
```javascript
// ❌ PROBLEMA: DOS lugares para el mismo dato
ResizeHandler.state.resizingNodeId       // Estado local
DesignerStore.state.interaction.resizingNodeId  // Estado centralizado
```

**Consecuencia**: DesignerController lee del lugar equivocado → rendering desincronizado

### 2. **Handles No se Renderizan**
```javascript
// ❌ PROBLEMA: VisualEffects.drawResizeHandles() existe pero NUNCA se llama
// No hay código que renderice los handles visuales en ContainerRenderer o UIRenderer
```

**Consecuencia**: Usuario no ve dónde clickear, sistema parece roto

### 3. **Múltiples Puntos de Verdad para `_active`**
```javascript
// ❌ PROBLEMA: _active se establece en múltiples lugares
InteractionHandler.setState()  // Pone _active = true
InteractionHandler.clearState()  // Pone _active = false
InteractionHandler.end()  // También pone _active = false
```

**Consecuencia**: Race conditions, estado inconsistente

### 4. **No hay Validación de Sincronización**
```javascript
// ❌ PROBLEMA: No hay guardas que verifiquen sincronización
// Si handler.state.resizingNodeId ≠ Store.state.interaction.resizingNodeId
// → El sistema colapsa silenciosamente
```

---

## ✅ Solución: Arquitectura Unificada

### Principio #1: **Single Source of Truth**

```javascript
// ✅ SOLUCIÓN: DesignerStore es la ÚNICA fuente de verdad
DesignerStore.state.interaction = {
    hoveredNodeId: null,
    selectedNodeId: null,
    draggingNodeId: null,
    resizingNodeId: null,    // ← ÚNICA ubicación
    activeMode: 'IDLE',      // IDLE | DRAG | RESIZE | DRAW | PAN
    resizeCorner: null,      // nw | ne | sw | se
    // ... otros datos de interacción
}
```

**Beneficios**:
- Un solo lugar para leer/escribir
- Historial de cambios gratis (ya implementado en Store)
- Fácil debugging (`console.log(DesignerStore.state.interaction)`)

---

### Principio #2: **Handlers como Controladores Sin Estado**

```javascript
// ✅ SOLUCIÓN: ResizeHandler solo coordina, NO almacena estado crítico
export class ResizeHandler extends InteractionHandler {
    onStart(e, context) {
        // 1. Calcular valores temporales (deltas, offsets)
        const tempState = this.calculateStartState(context);

        // 2. Actualizar SOLO el Store (Single Source of Truth)
        DesignerStore.setInteractionState({
            resizingNodeId: context.nodeId,
            activeMode: 'RESIZE',
            resizeCorner: context.corner,
            resizeStartPos: context.initialPos
        });

        // 3. Estado local SOLO para datos efímeros (no críticos)
        this.tempCache = tempState;
    }

    onUpdate(e) {
        // Lee del Store, NO del estado local
        const { resizingNodeId } = DesignerStore.state.interaction;
        if (!resizingNodeId) return;
        // ... lógica de resize
    }

    isActive() {
        // ✅ Lee del Store, no de this._active
        return DesignerStore.state.interaction.activeMode === 'RESIZE';
    }
}
```

**Beneficios**:
- No hay desincronización posible
- `isActive()` siempre retorna el valor correcto
- Cualquier componente puede leer el estado sin pedir al handler

---

### Principio #3: **Rendering Centralizado de UI**

```javascript
// ✅ SOLUCIÓN: UIRenderer renderiza handles basándose en el Store
export const UIRenderer = {
    render(ctx, nodes, camera) {
        const { resizingNodeId, selectedNodeId } = DesignerStore.state.interaction;

        // Renderizar handles para nodos seleccionados resizables
        if (selectedNodeId && !resizingNodeId) {
            const node = nodes[selectedNodeId];
            if (node?.isRepoContainer || node?.isStickyNote) {
                this.renderResizeHandles(ctx, node, camera);
            }
        }

        // Renderizar handles activos durante resize
        if (resizingNodeId) {
            const node = nodes[resizingNodeId];
            if (node) {
                this.renderActiveResizeHandles(ctx, node, camera);
            }
        }
    },

    renderResizeHandles(ctx, node, camera) {
        const zoom = camera.zoomScale;
        const sync = DimensionSync.getSyncDimensions(node, nodes, zoom);
        const corners = GeometryUtils.getRectCorners(sync.centerX, sync.centerY, sync.w, sync.h);

        VisualEffects.drawResizeHandles(ctx, Object.values(corners), zoom, {
            color: ThemeManager.colors.primary
        });
    }
}
```

**Beneficios**:
- Usuario SIEMPRE ve los handles cuando selecciona un container
- Feedback visual consistente
- Fácil de modificar (un solo lugar)

---

### Principio #4: **Validación Automática**

```javascript
// ✅ SOLUCIÓN: DesignerStore valida consistencia automáticamente
class DesignerStoreClass extends Store {
    setInteractionState(updates) {
        const newState = { ...this.state.interaction, ...updates };

        // VALIDACIÓN: Solo un modo activo a la vez
        if (newState.activeMode !== 'IDLE') {
            const activeModes = [
                newState.draggingNodeId && 'DRAG',
                newState.resizingNodeId && 'RESIZE',
                newState.isPanning && 'PAN'
            ].filter(Boolean);

            if (activeModes.length > 1) {
                console.error(`[InteractionError] Multiple active modes detected:`, activeModes);
                // Auto-corregir: cancelar todos excepto el más reciente
                this.cancelAllInteractions();
            }
        }

        this.setState({ interaction: newState }, 'INTERACTION_UPDATE');
    }

    cancelAllInteractions() {
        this.setState({
            interaction: {
                ...this.state.interaction,
                draggingNodeId: null,
                resizingNodeId: null,
                isPanning: false,
                activeMode: 'IDLE'
            }
        }, 'CANCEL_ALL');
    }
}
```

**Beneficios**:
- Detecta conflictos automáticamente
- Auto-recuperación de estados inválidos
- Logs claros para debugging

---

### Principio #5: **Coordinación Centralizada**

```javascript
// ✅ SOLUCIÓN: DesignerController lee SOLO del Store
class DesignerController {
    _executeRender() {
        const { interaction, nodes, connections, camera } = DesignerStore.state;

        // ✅ ÚNICA fuente de verdad
        const {
            hoveredNodeId,
            selectedNodeId,
            draggingNodeId,
            resizingNodeId,
            activeMode
        } = interaction;

        DesignerCanvas.render(
            this.canvas.width,
            this.canvas.height,
            nodes,
            camera,
            connections,
            hoveredNodeId,
            selectedNodeId,
            draggingNodeId,
            resizingNodeId
        );
    }
}
```

**Beneficios**:
- No hay confusión sobre qué valor leer
- Cambios en Store → automáticamente reflejados en render
- Fácil de testear (solo mockear Store)

---

## 🔧 Plan de Implementación (Post-Debug)

### Fase 1: **Fix Inmediato** (Después de recibir los logs)
1. Corregir el punto de falla específico identificado
2. Restaurar funcionalidad de resize

### Fase 2: **Migración a Single Source of Truth** (1-2 horas)
1. Mover `resizeStartMouse`, `resizeCorner` al Store
2. Eliminar `this.state` de ResizeHandler (solo cache temporal)
3. Cambiar `isActive()` para leer del Store
4. Actualizar DesignerController para leer del Store

### Fase 3: **Rendering de Handles** (30 min)
1. Implementar `UIRenderer.renderResizeHandles()`
2. Llamar en el render loop
3. Aplicar estilos hover/active

### Fase 4: **Validación y Guards** (30 min)
1. Agregar validación en `setInteractionState()`
2. Implementar `cancelAllInteractions()`
3. Agregar logs de warning para estados inválidos

### Fase 5: **Testing** (1 hora)
1. Probar resize en múltiples zoom levels
2. Probar interrupción (press Esc durante resize)
3. Probar cambio de modo (pan mientras resize)
4. Verificar que handles se renderizan correctamente

---

## 📊 Métricas de Éxito

### ✅ El sistema será robusto cuando:
- [ ] Resize funciona en zoom 0.1x, 1.0x, 3.0x
- [ ] Handles se renderizan en todas las situaciones
- [ ] `console.log(DesignerStore.state.interaction)` muestra SIEMPRE el estado correcto
- [ ] Presionar Esc cancela resize limpiamente
- [ ] No hay desincronización entre render y lógica
- [ ] Agregar un nuevo tipo de interacción (ej: rotate) no rompe resize

---

## 🚀 Expansibilidad Futura

Con esta arquitectura, agregar nuevas interacciones es trivial:

```javascript
// ✅ Agregar rotación de nodos (ejemplo futuro)
DesignerStore.state.interaction = {
    // ... estados existentes
    rotatingNodeId: null,
    rotationAngle: 0,
    activeMode: 'IDLE' // | 'ROTATE'
}

class RotateHandler extends InteractionHandler {
    onStart(context) {
        DesignerStore.setInteractionState({
            rotatingNodeId: context.nodeId,
            activeMode: 'ROTATE'
        });
    }

    isActive() {
        return DesignerStore.state.interaction.activeMode === 'ROTATE';
    }
}
```

**Sin riesgo de romper resize, drag, pan, etc.**

---

## 📝 Resumen

**Antes (Frágil)**:
- Estado en 2 lugares → desincronización
- Sin handles visuales → UX rota
- Sin validación → bugs silenciosos

**Después (Robusto)**:
- DesignerStore = única fuente de verdad
- UIRenderer = handles siempre visibles
- Validación automática = auto-recuperación
- Expansible sin riesgos

---

Espero tus logs para implementar esto. 🚀
