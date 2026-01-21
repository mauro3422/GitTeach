# Análisis del Sistema de Cajas Contenedoras - Problemas y Soluciones

## Resumen Ejecutivo
El sistema de cajas contenedoras tiene múltiples problemas de usabilidad y funcionalidad relacionados con el redimensionamiento manual. Este documento detalla los problemas identificados y propone soluciones.

---

## Problemas Identificados

### 1. **PROBLEMA CRÍTICO: Los nodos quedan fuera al achicar el contenedor**

**Ubicación:** `DesignerInteraction.js` líneas 308-331

**Causa raíz:** 
Cuando el usuario hace resize manual de un contenedor:
- Se actualiza `node.manualWidth` y `node.manualHeight`
- Los hijos NO se reorganizan para ajustarse a los nuevos límites
- `getContainerBounds()` retorna las dimensiones manuales sin validar si los hijos caben

**Efecto visible:**
```
┌─────────────┐       ┌───────┐
│  Contenedor │  →    │  Cont │  ← Achicado
├─────────────┤       └───────┘
│  ○ Node 1   │       ○ Node 1 ← ¡Queda afuera!
│  ○ Node 2   │       ○ Node 2 ← ¡Queda afuera!
└─────────────┘       
```

---

### 2. **PROBLEMA: Tamaño mínimo muy pequeño**

**Ubicación:** `DesignerInteraction.js` línea 312
```javascript
const minW = 60, minH = 40;
```

**Problemas:**
- 60x40 es insuficiente para contener incluso un solo nodo con label
- No considera el ancho de los labels (pueden ser 100+ px de ancho)
- No considera el padding necesario (60px definido)
- No considera múltiples filas de nodos

**Ejemplo del problema:**
```
Nodo con label: "worker_1_analyzer"
≈ 180px de ancho con el label
└─ El mínimo de 60px permite achicar hasta que el label se vea completamente afuera
```

---

### 3. **PROBLEMA: No hay detección de colisiones entre labels**

**Ubicación:** `DesignerCanvas.js` líneas 180-196

**Código actual:**
```javascript
children.forEach(c => {
    const r = this.getNodeRadius(c, zoomScale);
    const labelStr = c.label || "";
    const estimatedPixelWidth = labelStr.length * 13;
    const worldLabelWidth = estimatedPixelWidth / zoomScale;
    const effectiveHalfWidth = Math.max(r, worldLabelWidth / 2 + 10);
    
    minX = Math.min(minX, c.x - effectiveHalfWidth);
    maxX = Math.max(maxX, c.x + effectiveHalfWidth);
    // ...
});
```

**Problemas:**
- Solo calcula el bounds individual de cada nodo con su label
- NO verifica si los labels de diferentes nodos se superponen
- NO verifica si el label se superpone con otro nodo
- No hay algoritmo de anti-colisión

**Efecto visible:**
```
┌─────────────────────┐
│  Cache Store        │
├─────────────────────┤
│  ○ Node 1           │
│  ○ CacheRepository  │
│  ○ RepoCacheManager │  ← Estos labels se superponen!
│  ○ FileCacheManager │
└─────────────────────┘
```

---

### 4. **PROBLEMA: Transición suave ausente al redimensionar**

**Ubicación:** `DesignerInteraction.js` líneas 308-331

**Problema:**
- El resize es instantáneo (1:1 con el movimiento del mouse)
- Los hijos saltan de posición si se reorganizan
- No hay interpolación ni easing
- No hay feedback visual de que el contenedor está "reacomodando" los hijos

---

### 5. **PROBLEMA: El centro del contenedor se recalcula automáticamente**

**Ubicación:** `DesignerCanvas.js` líneas 218-231

**Código actual:**
```javascript
const children = Object.values(nodes).filter(n => n.parentId === node.id);
const hasChildren = children.length > 0;
const isAutoSize = !node.manualWidth && !node.manualHeight;
const anyChildDragging = children.some(c => c.isDragging);

if (hasChildren && isAutoSize && !node.isDragging && !anyChildDragging) {
    node.x = bounds.centerX;
    node.y = bounds.centerY;
}
```

**Problema:**
- El centro del contenedor se recalcula basándose en los hijos
- Si un nodo hijo se mueve, el contenedor entero se mueve
- Esto puede ser confuso para el usuario que quiere redimensionar el contenedor sin moverlo

---

### 6. **PROBLEMA: Layout de hijos no está optimizado**

**Ubicación:** `RoutingDesigner.js` líneas 476-504 (para Cache)

**Código actual:**
```javascript
const cols = 2;
const gapX = 220;
const gapY = 120;

parent.internalClasses.forEach((className, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    
    this.nodes[childId] = {
        x: parent.x + (col - (cols - 1) / 2) * gapX,
        y: parent.y + (row * gapY) + 50,
        // ...
    };
});
```

**Problemas:**
- Layout fijo en 2 columnas
- No se ajusta al tamaño del contenedor
- No detecta cuando hay más nodos de los que caben
- No reorganiza dinámicamente

---

## Soluciones Propuestas

### Solución 1: Validar tamaño mínimo dinámico

**Implementación sugerida:**
```javascript
// En DesignerInteraction.js
function calculateMinContainerSize(container, nodes, zoomScale) {
    const children = Object.values(nodes).filter(n => n.parentId === container.id);
    
    if (children.length === 0) {
        return { minW: 140, minH: 100 };
    }
    
    // Calcular tamaño necesario basado en labels
    let totalLabelWidth = 0;
    children.forEach(c => {
        const labelStr = c.label || "";
        totalLabelWidth += labelStr.length * 13 / zoomScale;
    });
    
    // Asumir layout de 2 columnas por defecto
    const cols = 2;
    const requiredWidth = Math.max(totalLabelWidth / cols * 1.5, 200);
    const requiredHeight = Math.ceil(children.length / cols) * 120 + 100;
    
    return {
        minW: Math.max(140, requiredWidth),
        minH: Math.max(100, requiredHeight)
    };
}

// En el resize
if (this.resizingNodeId) {
    const node = this.nodes[this.resizingNodeId];
    const dx = worldPos.x - this.resizeStartWorld.x;
    const dy = worldPos.y - this.resizeStartWorld.y;
    
    // Calcular mínimo dinámico para contenedores
    let minW, minH;
    if (node.isRepoContainer) {
        const minSize = calculateMinContainerSize(node, this.nodes, this.state.zoomScale);
        minW = minSize.minW;
        minH = minSize.minH;
    } else if (node.isStickyNote) {
        minW = 180;
        minH = 100;
    }
    
    let newW = this.resizeStartSize.w;
    let newH = this.resizeStartSize.h;
    
    // Apply delta
    if (this.resizeCorner === 'se') { newW += dx * 2; newH += dy * 2; }
    if (this.resizeCorner === 'sw') { newW -= dx * 2; newH += dy * 2; }
    if (this.resizeCorner === 'ne') { newW += dx * 2; newH -= dy * 2; }
    if (this.resizeCorner === 'nw') { newW -= dx * 2; newH -= dy * 2; }
    
    // Aplicar límites
    if (node.isStickyNote) {
        node.width = Math.max(minW, newW);
        node.height = Math.max(minH, newH);
    } else {
        node.manualWidth = Math.max(minW, newW);
        node.manualHeight = Math.max(minH, newH);
    }
    
    this.onUpdate();
    return;
}
```

---

### Solución 2: Reorganizar hijos al hacer resize

**Implementación sugerida:**
```javascript
// En DesignerInteraction.js
function reorganizeChildren(container, nodes, bounds) {
    const children = Object.values(nodes).filter(n => n.parentId === container.id);
    if (children.length === 0) return;
    
    // Detectar si algún hijo está fuera del contenedor
    const halfW = bounds.w / 2;
    const halfH = bounds.h / 2;
    const childrenOutside = children.filter(c => {
        const r = DesignerCanvas.getNodeRadius(c, this.state.zoomScale);
        const labelWidth = (c.label?.length || 0) * 13 / this.state.zoomScale;
        const effectiveHalfWidth = Math.max(r, labelWidth / 2 + 10);
        
        return c.x < container.x - halfW + effectiveHalfWidth ||
               c.x > container.x + halfW - effectiveHalfWidth ||
               c.y < container.y - halfH + r ||
               c.y > container.y + halfH - r;
    });
    
    if (childrenOutside.length > 0) {
        // Reorganizar en grid
        const cols = Math.max(2, Math.floor(bounds.w / 220));
        const gapX = (bounds.w - 40) / cols;
        const gapY = Math.max(100, bounds.h / Math.ceil(children.length / cols));
        
        children.forEach((child, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            
            const targetX = container.x - halfW + 40 + col * gapX + gapX / 2;
            const targetY = container.y - halfH + 60 + row * gapY;
            
            // Animar transición
            this.animateNodePosition(child, targetX, targetY);
        });
    }
}

// Animación suave
function animateNodePosition(node, targetX, targetY) {
    const startX = node.x;
    const startY = node.y;
    const duration = 200; // ms
    const startTime = performance.now();
    
    const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        
        node.x = startX + (targetX - startX) * ease;
        node.y = startY + (targetY - startY) * ease;
        
        this.onUpdate();
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    
    requestAnimationFrame(step);
}
```

---

### Solución 3: Algoritmo de detección de colisiones

**Implementación sugerida:**
```javascript
// En DesignerCanvas.js
detectLabelCollisions(node, children, zoomScale) {
    const collisions = [];
    
    for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
            const c1 = children[i];
            const c2 = children[j];
            
            const r1 = this.getNodeRadius(c1, zoomScale);
            const r2 = this.getNodeRadius(c2, zoomScale);
            
            const label1Width = (c1.label?.length || 0) * 13 / zoomScale;
            const label2Width = (c2.label?.length || 0) * 13 / zoomScale;
            
            const bounds1 = {
                x: c1.x - label1Width / 2 - 10,
                y: c1.y - r1 - 10,
                w: label1Width + 20,
                h: r1 * 2 + 20
            };
            
            const bounds2 = {
                x: c2.x - label2Width / 2 - 10,
                y: c2.y - r2 - 10,
                w: label2Width + 20,
                h: r2 * 2 + 20
            };
            
            if (this.rectsIntersect(bounds1, bounds2)) {
                collisions.push({ node1: c1, node2: c2 });
            }
        }
    }
    
    return collisions;
}

rectsIntersect(r1, r2) {
    return !(r1.x + r1.w < r2.x ||
             r2.x + r2.w < r1.x ||
             r1.y + r1.h < r2.y ||
             r2.y + r2.h < r1.y);
}
```

---

### Solución 4: Switch automático a modo auto-sizing

**Implementación sugerida:**
```javascript
// En DesignerInteraction.js
handleMouseUp() {
    // ... código existente ...
    
    if (this.resizingNodeId) {
        const node = this.nodes[this.resizingNodeId];
        
        // Verificar si los hijos caben
        if (node.isRepoContainer) {
            const bounds = DesignerCanvas.getContainerBounds(node, this.nodes, this.state.zoomScale);
            const childrenOutside = this.checkChildrenOutside(node, this.nodes, bounds);
            
            if (childrenOutside.length > 0) {
                // Switch a modo automático
                delete node.manualWidth;
                delete node.manualHeight;
                
                // Recalcular bounds automáticamente
                const newBounds = DesignerCanvas.getContainerBounds(node, this.nodes, this.state.zoomScale);
                
                // Reorganizar hijos con animación
                this.reorganizeChildren(node, this.nodes, newBounds);
                
                // Mostrar feedback
                this.showFeedback('Auto-sizing activado: nodos reorganizados');
            }
        }
        
        this.resizingNodeId = null;
        // ...
    }
}

showFeedback(message) {
    const existing = document.getElementById('resize-feedback');
    if (existing) existing.remove();
    
    const feedback = document.createElement('div');
    feedback.id = 'resize-feedback';
    feedback.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(88, 166, 255, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: var(--font-mono), monospace;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 3000);
}
```

---

### Solución 5: Mejorar el layout de hijos

**Implementación sugerida:**
```javascript
// En RoutingDesigner.js
createChildNodes(parentId, parent) {
    const children = Object.values(this.nodes).filter(n => n.parentId === parentId);
    const bounds = DesignerCanvas.getContainerBounds(parent, this.nodes, 1.0);
    
    // Calcular columnas óptimas basado en el ancho
    const nodeWidth = 220; // nodo + label + gap
    const cols = Math.max(1, Math.floor((bounds.w - 40) / nodeWidth));
    const rows = Math.ceil(children.length / cols);
    
    const gapX = (bounds.w - 40) / cols;
    const gapY = Math.max(100, (bounds.h - 80) / rows);
    
    children.forEach((child, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        
        const targetX = parent.x - bounds.w / 2 + 40 + col * gapX + gapX / 2;
        const targetY = parent.y - bounds.h / 2 + 60 + row * gapY;
        
        // Animar si la posición es significativamente diferente
        if (Math.abs(child.x - targetX) > 5 || Math.abs(child.y - targetY) > 5) {
            this.animateNodePosition(child, targetX, targetY);
        }
    });
}
```

---

## Cosas Adicionales a Considerar

### 1. **Indicador visual de modo de sizing**
- Mostrar si el contenedor está en "modo manual" o "modo automático"
- Diferenciar visualmente en el canvas (borde diferente, icono, etc.)

### 2. **Snap-to-grid para hijos**
- Opcional, pero ayuda a mantener alineación
- Configurable (on/off)

### 3. **Restricciones de aspect ratio**
- Permitir mantener el aspect ratio al redimensionar
- Tecla Shift para activar/desactivar

### 4. **Colisiones entre contenedores**
- Prevenir que contenedores se superpongan
- Push automático de contenedores vecinos

### 5. **Multi-selección de hijos**
- Permitir seleccionar varios hijos para moverlos en grupo
- Shift+click para selección múltiple

### 6. **Copy/Paste de layouts**
- Guardar presets de layouts
- Reutilizar configuraciones entre contenedores

### 7. **Zoom-aware labels**
- Ajustar tamaño de labels proporcionalmente al zoom
- O mantener tamaño constante y ajustar layout

### 8. **Colisión con bordes del canvas**
- Prevenir que contenedores se salgan del viewport
- Scroll automático o resize del canvas

---

## Priorización de Soluciones

| Prioridad | Solución | Complejidad | Impacto |
|-----------|----------|-------------|---------|
| 1 | Validar tamaño mínimo dinámico | Media | Alta |
| 2 | Switch automático a modo auto-sizing | Media | Alta |
| 3 | Reorganizar hijos al hacer resize | Alta | Alta |
| 4 | Algoritmo de detección de colisiones | Alta | Media |
| 5 | Transiciones suaves | Media | Media |
| 6 | Mejorar layout de hijos | Baja | Media |
| 7 | Indicador visual de modo | Baja | Baja |

---

## Próximos Pasos

1. Implementar la solución de tamaño mínimo dinámico (Solución 1)
2. Agregar switch automático a modo auto-sizing (Solución 4)
3. Implementar detección básica de colisiones (Solución 3)
4. Agregar animaciones suaves para transiciones (Solución 2)
5. Refinar layout de hijos (Solución 5)
6. Agregar indicadores visuales y feedback al usuario

---

**Fecha de análisis:** 2026-01-21  
**Analizado por:** OpenCode  
**Proyecto:** Giteach - Routing Designer Canvas System
