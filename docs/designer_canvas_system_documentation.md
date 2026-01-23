# Documentación del Sistema de Diseño del Canvas (Giteach Designer)

## Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Sistema de Sincronización Lógica-Visual](#sistema-de-sincronización-lógica-visual)
4. [Componentes Principales](#componentes-principales)
5. [Tipos de Nodos](#tipos-de-nodos)
6. [Sistema de Interacción](#sistema-de-interacción)
7. [Sistema de Dimensiones](#sistema-de-dimensiones)
8. [Patrones de Diseño](#patrones-de-diseño)
9. [Consideraciones de Rendimiento](#consideraciones-de-rendimiento)
10. [Guía de Implementación](#guía-de-implementación)

## Descripción General

El sistema de diseño del canvas es un componente central de Giteach Designer que permite a los usuarios crear y manipular nodos visuales (sticky notes y containers) en un lienzo interactivo. El sistema proporciona funcionalidades de redimensionamiento, arrastre, selección y visualización con soporte para diferentes niveles de zoom.

## Arquitectura del Sistema

El sistema sigue una arquitectura modular con los siguientes componentes principales:

```
┌─────────────────────────────────────────────────────────────┐
│                    Designer Interaction Layer              │
├─────────────────────────────────────────────────────────────┤
│  ResizeHandler  │  DragHandler  │  HoverManager  │  etc.  │
├─────────────────────────────────────────────────────────────┤
│                    Designer Core Layer                     │
├─────────────────────────────────────────────────────────────┤
│  DesignerStore  │  DesignerInteraction  │  GeometryUtils  │
├─────────────────────────────────────────────────────────────┤
│                   Rendering Layer                          │
├─────────────────────────────────────────────────────────────┤
│  ContainerRenderer  │  NodeRenderer  │  ConnectionRenderer │
└─────────────────────────────────────────────────────────────┘
```

## Sistema de Sincronización Lógica-Visual

### Problema Abordado
El sistema original tenía una desconexión entre:
- **Coordenadas lógicas**: Usadas para cálculos internos
- **Coordenadas visuales**: Usadas para renderizado
- **Áreas de detección**: Usadas para interacciones

Esto causaba problemas como:
- Handles de redimensionamiento detectados en posiciones incorrectas
- Interacciones que se activaban desde posiciones "fantasma"
- Detección inexacta de nodos bajo el cursor

### Solución Implementada: DimensionSync

El sistema `DimensionSync` proporciona una capa de abstracción que mantiene la sincronización entre lógica y visual:

```javascript
// Uso típico
const dims = DimensionSync.getVisualDimensions(node, zoom, nodes);
const handlePos = DimensionSync.getVisualHandlePosition(node, corner, zoom, nodes);
const isValid = DimensionSync.validateSync(node, zoom, nodes);
```

### Características del Sistema de Sincronización

1. **Sistema de Fallback Inteligente**:
   - Intenta usar dimensiones visuales que reflejen contenido de texto para sticky notes
   - Intenta usar dimensiones visuales para containers que reflejen estado actual
   - Usa dimensiones lógicas como fallback seguro cuando visuales no están disponibles
   - Validación completa de valores para evitar NaN, Infinity o indefinidos

2. **Manejo de Errores Robusto**:
   - Captura de excepciones para entornos de prueba sin contexto adecuado
   - Recuperación automática a dimensiones lógicas en caso de error
   - Compatibilidad con entornos de prueba y producción

3. **Sistema de Coordenadas Consistente**:
   - Uso del centro del nodo como punto de referencia para ambos tipos de nodos
   - Eliminación de inconsistencias entre diferentes sistemas de coordenadas
   - Asegura que las posiciones de handles coincidan con lo que el usuario ve

## Componentes Principales

### 1. ResizeHandler.js
Responsabilidad: Gestión de interacciones de redimensionamiento

**Características clave**:
- Detecta handles de redimensionamiento en esquinas de nodos
- Usa las mismas coordenadas y dimensiones que el sistema de renderizado para consistencia
- Maneja operaciones de redimensionamiento para sticky notes y containers
- Mantiene proporciones y límites mínimos de tamaño

**Flujo de trabajo**:
1. `findResizeHandle(worldPos)`: Busca handles en posición del mouse
2. `onStart()`: Inicia operación de redimensionamiento
3. `onUpdate()`: Actualiza dimensiones durante arrastre
4. `onEnd()`: Finaliza operación y actualiza nodo

**Sistema de Sincronización Implementado**:
- Para sticky notes: Usa `bounds.centerX`, `bounds.centerY`, `bounds.renderW`, `bounds.renderH` del sistema de renderizado
- Para containers: Usa `bounds.centerX`, `bounds.centerY`, `bounds.renderW`, `bounds.renderH` del sistema de renderizado
- Asegura que las posiciones de handles coincidan exactamente con las posiciones de renderizado

### 2. DesignerStore.js
Responsabilidad: Gestión del estado del diseñador y detección de nodos

**Características clave**:
- Almacena nodos, conexiones y estado de interacción
- Función `findNodeAt(worldPos, excludeId, zoomScale)` para detección de nodos
- Uso de dimensiones visuales para cálculo de áreas de detección
- Prioridad de detección basada en orden visual (z-index)

### 3. GeometryUtils.js
Responsabilidad: Cálculos geométricos y de dimensiones

**Funciones importantes**:
- `getStickyNoteBounds(node, ctx, zoom)`: Calcula dimensiones visuales de sticky notes
- `getContainerBounds(node, nodes, zoom)`: Calcula dimensiones visuales de containers
- `getRectCorners(centerX, centerY, w, h)`: Calcula esquinas de rectángulos
- `getDistance(p1, p2)`: Calcula distancia entre puntos

### 4. DimensionSync.js
Responsabilidad: Sincronización entre dimensiones lógicas y visuales

**Funciones principales**:
- `getVisualDimensions(node, zoom, nodes)`: Obtiene dimensiones sincronizadas
- `getVisualHandlePosition(node, corner, zoom, nodes)`: Calcula posición visual de handles
- `validateSync(node, zoom, nodes)`: Valida consistencia de sincronización

## Tipos de Nodos

### 1. Sticky Notes (`isStickyNote: true`)
- **Características**: 
  - Dimensiones afectadas por contenido de texto
  - Renderizado con soporte para texto multilínea
  - Dimensiones visuales calculadas dinámicamente
- **Cálculo de dimensiones**: Basado en contenido de texto y nivel de zoom
- **Interacciones**: Redimensionamiento, edición de texto, selección

### 2. Containers (`isRepoContainer: true`)
- **Características**:
  - Dimensiones lógicas con posibilidad de contenido visual
  - Soporte para nodos hijos
  - Dimensiones visuales afectadas por zoom
- **Cálculo de dimensiones**: Basado en dimensiones lógicas y nivel de zoom
- **Interacciones**: Redimensionamiento, arrastre, contención de nodos

### 3. Otros Nodos
- **Características**: 
  - Dimensiones fijas o predeterminadas
  - Uso de dimensiones lógicas como fallback
- **Interacciones**: Selección, arrastre

## Sistema de Interacción

### Flujo de Interacción de Redimensionamiento

1. **Detección de Handles**:
   - Usuario mueve mouse sobre esquina de nodo
   - `findResizeHandle()` detecta handles usando dimensiones visuales
   - Cursor cambia a `resize` si handle detectado

2. **Inicio de Redimensionamiento**:
   - Usuario hace clic en handle detectado
   - `onStart()` registra estado inicial
   - Nodo entra en modo de redimensionamiento

3. **Actualización de Dimensiones**:
   - Usuario arrastra handle
   - `onUpdate()` calcula nuevas dimensiones
   - Nodo se redimensiona en tiempo real

4. **Finalización**:
   - Usuario suelta mouse
   - `onEnd()` actualiza dimensiones finales
   - Nodo sale de modo de redimensionamiento

### Prioridad de Interacción

El sistema sigue un orden de prioridad:
1. Nodo seleccionado actualmente (si es resizable)
2. Nodos en orden visual inverso (topmost first)
3. Nodos no seleccionados

## Sistema de Dimensiones

### Coordenadas y Dimensiones

El sistema usa un sistema de coordenadas consistente:

```
    (centerX - w/2, centerY - h/2) ┌─────────────────┐ (centerX + w/2, centerY - h/2)
                                  │                 │
                                  │    NODO         │
                                  │                 │
    (centerX - w/2, centerY + h/2) └─────────────────┘ (centerX + w/2, centerY + h/2)
```

Donde:
- `(centerX, centerY)`: Centro del nodo
- `w, h`: Dimensiones del nodo (lógicas o visuales según contexto)

### Cálculo de Handles

Los handles se calculan en las esquinas del rectángulo:
- `nw`: (centerX - w/2, centerY - h/2) - Northwest (superior izquierda)
- `ne`: (centerX + w/2, centerY - h/2) - Northeast (superior derecha)
- `sw`: (centerX - w/2, centerY + h/2) - Southwest (inferior izquierda)
- `se`: (centerX + w/2, centerY + h/2) - Southeast (inferior derecha)

### Sistema de Escalado Visual

Las dimensiones visuales se calculan considerando:
- Nivel de zoom actual
- Contenido de texto (para sticky notes)
- Factores de escala visual para legibilidad
- Dimensiones mínimas para visibilidad

## Patrones de Diseño

### 1. Singleton para Estado Compartido
- `DesignerStore`: Estado global del diseñador
- `DimensionSync`: Sistema de sincronización centralizado

### 2. Estrategia de Interacción
- `ResizeHandler`, `DragHandler`, etc.: Implementan diferentes tipos de interacción
- `StrategyManager`: Coordina diferentes estrategias de interacción

### 3. Fachada para Geometría
- `GeometryUtils`: Proporciona interfaz unificada para cálculos geométricos
- Oculta complejidad de cálculos de dimensiones visuales

### 4. Adaptador para Contexto
- Controladores adaptan eventos del DOM a operaciones del diseñador
- Abstraen detalles de implementación específica del entorno

## Consideraciones de Rendimiento

### 1. Caching de Dimensiones
- Cálculo de dimensiones visuales puede ser costoso
- Implementar caching para dimensiones que no cambian frecuentemente

### 2. Optimización de Detección
- Iteración inversa para detección de nodos (evita recorrer todos)
- Umbral de detección ajustable según nivel de zoom

### 3. Gestión de Memoria
- Limpiar referencias a nodos eliminados
- Evitar fugas de memoria en listeners de eventos

## Guía de Implementación

### Agregar Nueva Funcionalidad de Interacción

1. **Crear nuevo Handler**:
```javascript
import { InteractionHandler } from './InteractionHandler.js';

export class NewFeatureHandler extends InteractionHandler {
    onStart(e, context) { /* Lógica de inicio */ }
    onUpdate(e) { /* Lógica de actualización */ }
    onEnd(e) { /* Lógica de finalización */ }
}
```

2. **Integrar con DimensionSync**:
```javascript
// En lugar de usar dimensiones lógicas directamente
const dims = DimensionSync.getVisualDimensions(node, zoom, nodes);
const position = DimensionSync.getVisualHandlePosition(node, corner, zoom, nodes);
```

3. **Actualizar DesignerInteraction**:
```javascript
// Registrar el nuevo handler
this.newFeatureHandler = new NewFeatureHandler(this);
```

### Mejorar la Detección de Interacciones

1. **Usar el sistema de coordenadas del centro**:
```javascript
// Correcto
const corners = GeometryUtils.getRectCorners(centerX, centerY, w, h);

// Incorrecto (sistema de esquina superior izquierda)
const corners = GeometryUtils.getRectCornersFromTopLeft(x, y, w, h); // No existe
```

2. **Considerar dimensiones visuales para nodos con contenido dinámico**:
```javascript
// Para sticky notes
if (node.isStickyNote) {
    const bounds = GeometryUtils.getStickyNoteBounds(node, null, zoom);
    const w = bounds.renderW || bounds.w;  // Usar dimensiones visuales primero
    const h = bounds.renderH || bounds.h;
}
```

3. **Implementar fallback seguro**:
```javascript
// Verificar validez de dimensiones antes de usarlas
if (w > 0 && h > 0 && !isNaN(w) && !isNaN(h) && isFinite(w) && isFinite(h)) {
    // Usar dimensiones
} else {
    // Usar fallback
}
```

## Solución de Problemas Comunes

### 1. Handles Detectados en Posiciones Incorrectas
- **Causa**: Uso de dimensiones lógicas en lugar de visuales
- **Solución**: Usar `DimensionSync.getVisualDimensions()`

### 2. Interacciones que No Responden
- **Causa**: Problemas con el sistema de coordenadas o umbrales de detección
- **Solución**: Verificar cálculo de esquinas y ajustar `hitThreshold`

### 3. Problemas en Entornos de Prueba
- **Causa**: Falta de contexto de canvas para medir texto
- **Solución**: Implementar fallback a dimensiones lógicas

## Futuras Extensiones

### 1. Soporte para Nuevos Tipos de Nodos
- Extender `DimensionSync.getVisualDimensions()` para nuevos tipos
- Asegurar consistencia con sistema de coordenadas del centro

### 2. Mejoras en el Sistema de Dimensiones
- Caching más sofisticado para dimensiones visuales
- Sistema de validación más robusto

### 3. Optimizaciones de Rendimiento
- Virtualización para lienzos con muchos nodos
- Cálculo incremental de dimensiones visuales

---

Esta documentación proporciona una visión completa del sistema de diseño del canvas de Giteach Designer, enfocándose especialmente en el sistema de sincronización lógica-visual implementado para resolver problemas de imprecisión en el redimensionamiento.