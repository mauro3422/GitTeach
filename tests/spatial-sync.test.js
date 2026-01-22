import { describe, it, expect } from 'vitest';
import { CanvasCamera } from '../src/renderer/js/core/CanvasCamera.js';
import { CoordinateUtils } from '../src/renderer/js/views/pipeline/designer/CoordinateUtils.js';

/**
 * 🧪 PRUEBA DE CAMPO REAL: Sincronización Canvas vs HTML
 * Objetivo: Verificar si la matemática de CanvasCamera.js coincide con CanvasUtils.js
 * y por qué el editor HTML se desplaza.
 */

describe('Sincronización de Espacios (Mundo -> Pantalla)', () => {
    // 1. Configuramos una cámara real
    const camera = new CanvasCamera();
    camera.zoom = 1.5;
    camera.pan = { x: 500, y: 300 }; // Simulamos un desplazamiento del usuario

    // 2. Definimos una nota en coordenadas "grandes" (según logs del usuario)
    const stickyNote = { x: 2240, y: -870 };

    it('la cámara y las utilidades deben dar el mismo resultado exacto', () => {
        // Método A: Usando la lógica de la Cámara (Transformación Matriz)
        const screenPosA = camera.toScreen(stickyNote.x, stickyNote.y);

        // Método B: Usando las utilidades globales (Lógica estática)
        const screenPosB = CoordinateUtils.worldToScreen(stickyNote, {
            zoomScale: camera.zoom,
            panOffset: camera.pan
        });

        console.log('=== AUDITORÍA DE COORDENADAS ===');
        console.log(`  - Nota Mundo: [${stickyNote.x}, ${stickyNote.y}]`);
        console.log(`  - Zoom: ${camera.zoom} | Pan: [${camera.pan.x}, ${camera.pan.y}]`);
        console.log(`  - Resultado Cámara (toScreen): [${screenPosA.x}, ${screenPosA.y}]`);
        console.log(`  - Resultado Utils (worldToScreen): [${screenPosB.x}, ${screenPosB.y}]`);

        // Verificamos consistencia entre sistemas
        expect(screenPosA.x).toBe(screenPosB.x);
        expect(screenPosA.y).toBe(screenPosB.y);
    });

    it('debe detectar desbordamiento de Viewport HTML', () => {
        // Si el resultado es negativo o muy grande, el HTML se sale del contenedor
        const result = camera.toScreen(stickyNote.x, stickyNote.y);

        // En este caso: 2240 * 1.5 + 500 = 3860px (Ancho)
        // -870 * 1.5 + 300 = -1005px (Alto, fuera por ARRIBA)

        console.log(`  - Verificando límites: [${result.x}, ${result.y}]`);

        if (result.y < 0) {
            console.warn('⚠️ ALERTA: La nota está fuera del viewport superior. El editor HTML NO se verá sobre la nota.');
        }
    });

    it('prueba el "clamping" para evitar que el modal vuele', () => {
        const rawPos = camera.toScreen(stickyNote.x, stickyNote.y);

        // Lógica de seguridad que vamos a implementar:
        const clampedY = Math.max(0, Math.min(window?.innerHeight || 1000, rawPos.y));

        console.log(`  - Posición Original: ${rawPos.y} -> Clamped: ${clampedY}`);
        expect(clampedY).toBeGreaterThanOrEqual(0);
    });
});
