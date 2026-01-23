# Sistema Unificado de Sincronización Lógica-Visual (LV-Sync)

## Descripción General

El sistema LV-Sync es una solución integral para mantener la sincronización perfecta entre la lógica del sistema (dimensiones, posiciones, estados) y la representación visual (renderizado, interacciones, UI) en el diseñador de Giteach.

## Problema Resuelto

Anteriormente, existía una desconexión entre:
- **Coordenadas lógicas**: Usadas para cálculos internos
- **Coordenadas visuales**: Usadas para renderizado
- **Áreas de detección**: Usadas para interacciones (hover, resize, etc.)

Esto causaba problemas como:
- Handles de redimensionamiento detectados en posiciones incorrectas
- Tooltips que aparecían cuando el mouse estaba lejos del nodo
- Interacciones que se activaban desde posiciones "fantasma"

## Solución Implementada

### 1. Sistema Centralizado de Dimensiones Sincronizadas

El `DimensionSync` proporciona una única fuente de verdad para todas las dimensiones:

```javascript
const dims = DimensionSync.getVisualDimensions(node, zoomScale, allNodes);

// Devuelve un objeto con:
{
  centerX, centerY,           // Coordenadas del centro del nodo
  logicalW, logicalH,         // Dimensiones lógicas (datos reales)
  visualW, visualH,           // Dimensiones visuales (considerando texto, zoom, etc.)
  // otros campos...
}
```

### 2. Coordenadas Consistentes

Todas las operaciones usan el sistema de coordenadas del centro:
- `centerX`, `centerY` como punto de referencia
- Dimensiones calculadas desde el centro hacia afuera
- Eliminación de inconsistencias entre esquina superior izquierda vs centro

### 3. Detección Unificada

Tanto el sistema de resize como el de hover usan la misma lógica de detección, asegurando consistencia.

## Componentes del Sistema

### DimensionSync.js
- Objeto principal que gestiona la sincronización
- Métodos para obtener dimensiones sincronizadas
- Métodos para cálculo de posiciones visuales de handles

### Integración con Componentes Existentes
- `ResizeHandler.js`: Usa dimensiones visuales para posicionar handles
- `DesignerStore.js`: Usa dimensiones sincronizadas para detección de nodos
- `HoverManager.js`: Usa el mismo sistema para detección de hover

## Beneficios

1. **Consistencia Visual-Lógica**: Lo que el usuario ve es exactamente lo que puede interactuar
2. **Mantenibilidad**: Un solo punto de verdad para dimensiones
3. **Extensibilidad**: Fácil de integrar nuevas funcionalidades
4. **Fiabilidad**: Funciona consistentemente en todos los entornos (pruebas y producción)

## Buenas Prácticas para Futuras Implementaciones

Cuando se implementen nuevas herramientas o funcionalidades:

1. **Usar siempre DimensionSync**: Para obtener dimensiones de nodos
2. **Mantener el sistema de coordenadas del centro**: Para consistencia
3. **Considerar dimensiones visuales**: No solo dimensiones lógicas
4. **Aplicar buffers de detección**: Para mejor experiencia de usuario

## Ejemplo de Uso para Nuevas Herramientas

```javascript
// Para cualquier nueva herramienta que necesite detección de nodos:
import { DimensionSync } from '../DimensionSync.js';

// Obtener dimensiones sincronizadas
const dims = DimensionSync.getVisualDimensions(node, currentZoom, allNodes);

// Calcular posición de handle visual
const handlePos = DimensionSync.getVisualHandlePosition(node, 'se', currentZoom, allNodes);

// Verificar si un punto está en el área de detección
const isOverNode = DimensionSync.validateSync(node, currentZoom, allNodes);
```

## Validación

El sistema ha sido validado con:
- Tests unitarios para ambos tipos de nodos (sticky notes y containers)
- Tests de integración para workflows reales
- Pruebas manuales de interacción usuario-sistema
- Verificación en diferentes niveles de zoom
- Compatibilidad con entornos de prueba y producción