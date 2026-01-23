import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateUtils } from '../src/renderer/js/views/pipeline/designer/CoordinateUtils.js';

/**
 * TEST DE SALUD REAL: Sincronización de Cámara y Proyección
 * Este test valida que el sistema de coordenadas no se desincronice.
 * Si esto falla, el "hit detect" (clics) y el dibujo se separan.
 */
describe('Salud Crítica: Proyección de Coordenadas (Real)', () => {

    const navState = {
        panOffset: { x: 100, y: 100 },
        zoomScale: 0.5 // Bajo zoom, donde suelen ocurrir los fallos
    };

    it('debe transformar pantalla a mundo y viceversa sin pérdida de precisión', () => {
        const screenPoint = { x: 500, y: 500 };

        // 1. Pantalla -> Mundo
        const worldPoint = CoordinateUtils.screenToWorld(screenPoint, navState);

        // A zoom 0.5 y offset 100: (500 - 100) / 0.5 = 800
        expect(worldPoint.x).toBe(800);
        expect(worldPoint.y).toBe(800);

        // 2. Mundo -> Pantalla (Debe volver al origen exacto)
        const backToScreen = CoordinateUtils.worldToScreen(worldPoint, navState);

        expect(backToScreen.x).toBe(screenPoint.x);
        expect(backToScreen.y).toBe(screenPoint.y);
    });

    it('debe mantener la integridad a zoom extremo (0.1x)', () => {
        const extremeState = { panOffset: { x: 0, y: 0 }, zoomScale: 0.1 };
        const point = { x: 10, y: 10 };

        const world = CoordinateUtils.screenToWorld(point, extremeState);
        expect(world.x).toBe(100); // 10 / 0.1

        const screen = CoordinateUtils.worldToScreen(world, extremeState);
        expect(screen.x).toBe(10);
    });
});
