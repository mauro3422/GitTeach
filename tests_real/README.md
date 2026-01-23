# 🧪 Suite de Tests Reales (Giteach Designer)

Esta carpeta contiene la "Verdad Terrestre" del sistema. A diferencia de los tests antiguos que usaban mocks de mierda, aquí seguimos reglas estrictas para garantizar la salud real del software.

## 📜 Principios de Oro

1.  **CERO Mocks de Lógica**: Está prohibido mockear `ScalingCalculator`, `GeometryUtils` o cualquier clase de negocio. Los tests deben usar el código de producción real.
2.  **Alta Fidelidad (JSDOM)**: Usamos `jsdom` para simular el entorno de Electron. Esto permite que el código crea que tiene un Canvas, un Mouse y eventos reales sin inventar datos.
3.  **Tests de Contrato**: Los tests no solo prueban que "no explote", sino que verifican contratos físicos (ej: "A zoom 0.1x, el texto DEBE medir 10px en pantalla").
4.  **Sin "Hardcoded Data"**: Si necesitamos nodos para un test, usamos los generadores reales o el estado real del Store cuando sea posible.

## 🛠️ Cómo crear un test

Para crear un nuevo test de salud, sigue esta estructura:

```javascript
// Para Vitest 1.6.0 con configuración de globals: true
// NO importar las funciones de Vitest (describe, it, expect) explícitamente
// Solo importar módulos del proyecto
import { MiComponenteReal } from '../src/...';

describe('Salud Crítica: MiComponente', () => {
    it('debe comportarse correctamente en entorno real', () => {
        // JSDOM provee window y document automáticamente
        const el = document.createElement('div');
        // ... usar MiComponenteReal ...
    });
});
```

## ⚠️ Problemas Comunes y Soluciones

### Problema: "No test suite found" o "describe is not defined"
**Causa**: En Vitest 1.6.0 con `globals: true`, no se deben importar explícitamente las funciones de Vitest (`describe`, `it`, `expect`) si el archivo también tiene otras importaciones.
**Solución**: Usar la configuración de `globals: true` en vitest.config.js y no importar las funciones de Vitest en el archivo de test.

### Problema: Tests fallan pero no dan error de sintaxis
**Causa**: Puede haber discrepancias entre la lógica de prueba y la implementación real del código.
**Solución**: Verificar que los cálculos y expectativas del test coincidan con el comportamiento real del sistema.

## 🧪 Estándares para Pruebas Reales

### 1. Configuración Correcta
- Usar `vitest.config.js` con `globals: true` para evitar importaciones explícitas
- Incluir ambos directorios: `tests/**/*.test.js` y `tests_real/**/*.test.js`
- Usar `jsdom` como entorno para alta fidelidad

### 2. Pruebas con Código Real
- Importar módulos directamente del código fuente
- No usar mocks para lógica de negocio
- Simular interacciones reales del usuario

### 3. Verificación de Contratos Visuales
- Probar que las dimensiones visuales coincidan con las lógicas esperadas
- Verificar que la detección de elementos se base en su representación visual, no en valores lógicos abstractos
- Validar comportamiento en diferentes niveles de zoom

## 🚩 Archivos en esta carpeta

-   `camera_projection.test.js`: Verifica que la cámara y el zoom no deformen las coordenadas.
-   `edge_contract.test.js`: Garantiza que las líneas toquen los bordes de los nodos.
-   `legibility_contract.test.js`: Asegura que el texto sea legible a cualquier escala.
-   `sticky_note_resize_visual_accuracy.test.js`: Verifica que los handles de redimensionamiento se detecten según las dimensiones visuales, no lógicas, especialmente para sticky notes con contenido de texto.

**Si un test aquí falla, significa que el sistema está roto para el usuario.**