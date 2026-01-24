# ✅ Complete Node System - Fully Standardized & Robust

## 🏗️ Arquitectura Completa de Nodos

El sistema de nodos está ahora dividido en **4 capas SSOT (Single Source of Truth)**:

```
┌──────────────────────────────────────────────────────┐
│          NodeFactory (Creation SSOT)                │
│  - Crea nodos con propiedades garantizadas          │
│  - 4 tipos: Regular, Satellite, Container, Sticky  │
│  - Validación automática                           │
└──────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│         NodeVisualManager (Visual SSOT)             │
│  - Calcula estado visual para cada nodo            │
│  - opacity, glow, colors según interacción         │
│  - Proporciona info a renderers                    │
└──────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│       DragManager / ResizeHandler (Interaction)     │
│  - Maneja movimiento y redimensionamiento          │
│  - Usa info de NodeVisualManager                   │
└──────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│            NodeRenderer (Rendering)                │
│  - Dibuja nodos usando visual info                │
│  - Usa NodeVisualManager para estado               │
└──────────────────────────────────────────────────────┘
```

---

## 📋 Los 4 Pilares SSOT

### 1. **NodeFactory** (Creation)
**Archivo**: `src/renderer/js/views/pipeline/designer/modules/NodeFactory.js`

**Responsabilidad**:
- Crear nodos con TODAS propiedades garantizadas
- 4 tipos: Regular, Satellite, Container, StickyNote
- Validación automática
- Builder pattern para casos complejos

**Métodos Públicos**:
```javascript
// Crear por tipo
NodeFactory.createRegularNode(options)
NodeFactory.createSatelliteNode(options)
NodeFactory.createContainerNode(options)
NodeFactory.createStickyNote(options)

// Builder pattern
NodeFactory.builder('container')
    .labeled('Mi Container')
    .at(100, 200)
    .colored('#ff00ff')
    .withIcon('📦')
    .build()

// Utilidades
NodeFactory.clone(node, overrides)
NodeFactory.isValidNode(node)
NodeFactory.getCriticalProps(node)
```

**Propiedades Garantizadas por Nodo**:
```javascript
{
    // Críticas
    id: string,
    x: number,
    y: number,
    label: string,
    color: string,
    icon: string,

    // Estándar
    description: string,
    message: string | null,
    parentId: string | null,

    // Renderizado
    isDragging: boolean,
    isSelected: boolean,
    isHovered: boolean,

    // Tipo (mutuamente excluyentes)
    isRepoContainer: boolean,
    isStickyNote: boolean,
    isSatellite: boolean,

    // Dimensiones (según tipo)
    dimensions: { w, h, animW, animH, targetW, targetH, isManual },

    // Internas
    _originalPos: null,
    _lastHoverState: null
}
```

---

### 2. **NodeVisualManager** (Visual State)
**Archivo**: `src/renderer/js/views/pipeline/designer/modules/NodeVisualManager.js`

**Responsabilidad**:
- Calcular cómo SE VE cada nodo según estado
- opacity, glow, colors
- Aislar de DesignerStore (acceso vía parámetros)

**Métodos Públicos**:
```javascript
// Core
NodeVisualManager.getNodeVisualState(node, interactionState)
  → Retorna: { opacity, glowIntensity, glowColor, state, ... }

// Helpers
NodeVisualManager.getGlowConfig(visual)
  → Retorna: { shadowBlur, shadowColor }

NodeVisualManager.isVisible(node, interactionState)
  → Retorna: boolean

NodeVisualManager.getLabelColor(node, visual)
  → Retorna: color string

NodeVisualManager.validateVisualState(visual)
  → Retorna: boolean

NodeVisualManager.hasVisualChanged(prev, current)
  → Retorna: boolean (detectar cambios para redraw)
```

**Estados Visuales**:
```javascript
{
    opacity: 0.0-1.0,              // Visibilidad
    glowIntensity: 0.0+,           // Intensidad de brillo
    glowMultiplier: 1.0 | 2.5,     // 2.5x si SELECTED
    glowColor: string,              // Color del glow (neon)
    borderWidth: number,            // Grosor del borde
    state: 'normal' | 'hovered' | 'selected' | 'dragging' | 'resizing',
    isSelected: boolean,
    isHovered: boolean,
    isDragging: boolean,
    isResizing: boolean
}
```

**Lógica**:
- Regular nodes: opacity 1.0, glow low
- Satellite nodes: opacity 0.6, glow 0.3x, NUNCA se atenúan
- Containers: opacity 1.0, glow medium
- Sticky notes: opacity 1.0, glow 0.5x
- Si otro nodo está activo (drag/selection): otros se atenúan (EXCEPT satélites)

---

### 3. **DragManager** & **ResizeHandler** (Interaction)
**Archivos**: `DragManager.js`, `ResizeHandler.js`

Ya documentados. Esos usan info de NodeVisualManager para renderizado.

---

### 4. **NodeRenderer** (Rendering)
**Archivo**: `src/renderer/js/views/pipeline/designer/renderers/NodeRenderer.js`

**Responsabilidad**:
- Dibujar nodos en canvas
- Usar visual info de NodeVisualManager
- NO calcular estados (solo usar lo que retorna NodeVisualManager)

**Patrón**:
```javascript
// 1. Obtener estado visual
const visual = NodeVisualManager.getNodeVisualState(node, {
    hoveredNodeId, selectedNodeId, draggingNodeId
});

// 2. Obtener config de glow
const glowConfig = NodeVisualManager.getGlowConfig(visual);

// 3. Aplicar al canvas
ctx.shadowBlur = glowConfig.shadowBlur;
ctx.shadowColor = glowConfig.shadowColor;
ctx.globalAlpha = visual.opacity;

// 4. Dibujar
CanvasPrimitives.drawNodeCircle(ctx, ...);
```

---

## 🔄 Flujo Completo: Crear → Visualizar → Interactuar

```
NodeFactory.createRegularNode()
    ↓
Nodo con propiedades garantizadas (id, x, y, label, color, icon, ...)
    ↓
Cada frame render:
    ↓
NodeVisualManager.getNodeVisualState(node, interactionState)
    ↓
Obtiene: opacity, glow, state, colors
    ↓
NodeRenderer dibuja usando visual info
    ↓
DragManager/ResizeHandler mueven nodo (si está en drag)
    ↓
NodeVisualManager recalcula estado en siguiente frame
    ↓
Loop...
```

---

## 🛠️ Cómo Usar

### Crear un nodo
```javascript
// Simple
const node = NodeFactory.createRegularNode({
    x: 100,
    y: 200,
    label: 'Mi Nodo',
    color: '#ff00ff',
    icon: '🚀'
});

// Builder pattern (para casos complejos)
const container = NodeFactory.builder('container')
    .labeled('Database')
    .at(300, 400)
    .described('Main database container')
    .withIcon('🗄️')
    .build();

// Garantizado que tiene TODAS las propiedades
console.log(node.id);        // ✓ Existe
console.log(node.dimensions); // ✓ Existe para containers
console.log(node.isSatellite); // ✓ Existe (false para este tipo)
```

### En NodeRenderer (obtener visual)
```javascript
const visual = NodeVisualManager.getNodeVisualState(node, {
    hoveredNodeId: hoveredNodeId,
    selectedNodeId: selectedNodeId,
    draggingNodeId: draggingNodeId
});

// Usar visual para renderizar
ctx.globalAlpha = visual.opacity;
const glowConfig = NodeVisualManager.getGlowConfig(visual);
ctx.shadowBlur = glowConfig.shadowBlur;
ctx.shadowColor = glowConfig.shadowColor;

// Dibujar nodo
CanvasPrimitives.drawNodeCircle(ctx, node.x, node.y, radius, node.color, ...);
```

### En DragManager (interacción)
```javascript
dragManager.updateDrag(worldPos, nodes);
// DragManager se encarga de mover node.x y node.y
// NodeVisualManager se encarga de visualizar el cambio en siguiente frame
```

---

## ✅ Garantías del Sistema

1. ✅ **Nodos SIEMPRE tienen propiedades válidas**
   - NodeFactory valida al crear
   - No hay nodos "incompletos"

2. ✅ **Visual estado SIEMPRE es consistente**
   - Un solo lugar calcula visual: NodeVisualManager
   - No hay conflictos de lógica visual

3. ✅ **Interacción no rompe visual**
   - DragManager mueve datos
   - NodeVisualManager proporciona visual
   - NodeRenderer solo dibuja

4. ✅ **Satélites NUNCA desaparecen**
   - NodeVisualManager no los atenúa
   - Siempre visibles aunque otro nodo esté activo

5. ✅ **Fácil extender sin romper**
   - Agregar propiedades: NodeFactory._createBaseNode()
   - Agregar efectos visuales: NodeVisualManager.getNodeVisualState()
   - Agregar rendering: NodeRenderer solo dibuja

---

## 🚀 Próximos Cambios Seguros

### Agregar propiedad de nodo
```javascript
// En NodeFactory._createBaseNode()
node.miPropiedad = options.miPropiedad ?? 'default';
```

### Agregar efecto visual
```javascript
// En NodeVisualManager.getNodeVisualState()
if (node.miPropiedad === 'especial') {
    glowIntensity *= 1.5;
}
```

### Agregar rendering personalizado
```javascript
// En NodeRenderer.render()
// Usar visual.miPropiedad para dibujar diferente
```

**Sin romper**: Cada cambio está aislado en su SSOT.

---

## 🧪 Debugging

```javascript
// Inspeccionar nodo
NodeFactory.debugNode(node);

// Inspeccionar estado visual
NodeVisualManager.debugVisualState(node, {
    hoveredNodeId, selectedNodeId, draggingNodeId
});

// Verificar si es válido
console.log(NodeFactory.isValidNode(node));

// Ver propiedades críticas
console.log(NodeFactory.getCriticalProps(node));

// En consola (dev mode)
window.NodeFactory.debugNode(node);
window.NodeVisualManager.debugVisualState(node, ...);
```

---

## 📊 Sistema Estandarizado Final

```
┌────────────────────────────────────────────────┐
│  TIER 1: Creation (NodeFactory)               │
│  ✓ Garantiza propiedades                      │
├────────────────────────────────────────────────┤
│  TIER 2: Visual (NodeVisualManager)           │
│  ✓ Calcula cómo se ve                         │
├────────────────────────────────────────────────┤
│  TIER 3: Interaction (DragManager/ResizeH.)  │
│  ✓ Maneja input                               │
├────────────────────────────────────────────────┤
│  TIER 4: Rendering (NodeRenderer)            │
│  ✓ Dibuja usando tiers anteriores             │
└────────────────────────────────────────────────┘
```

Patrón idéntico a **ResizeHandler** y **TextScalingManager**.

---

## 🎉 Beneficios Finales

1. ✅ **Zero ambiguidad** - Cada nodo tiene propiedades definidas
2. ✅ **Zero duplication** - Solo un lugar calcula visual
3. ✅ **Zero bugs** - Validación automática en creación
4. ✅ **Zero friction** - Extender es seguro
5. ✅ **Production-ready** - Sistema robusto para largo plazo

---

**Versión**: v2.80.3
**Status**: ✅ **FULLY STANDARDIZED & PRODUCTION-READY**

Sistema completo de nodos listo para implementaciones futuras sin miedo a romper nada.

