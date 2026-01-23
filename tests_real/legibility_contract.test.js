import { describe, it, expect } from 'vitest';
import { ScalingCalculator } from '../src/renderer/js/views/pipeline/designer/utils/ScalingCalculator.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

/**
 * TEST DE SALUD REAL: Contrato de Legibilidad
 * ¿Por qué es "Real"? Porque usa ScalingCalculator.js y GeometryUtils.js DIRECTAMENTE.
 * No estamos probando una copia matemática, estamos probando las funciones que dibujan tus notas.
 */
describe('Salud Crítica: Contrato de Legibilidad (Real Code)', () => {

    it('debe garantizar que a 40% de zoom el texto tenga un tamaño físico de al menos 10px', () => {
        const zoom = 0.4;
        const baseFontSize = 18;

        // Usamos la lógica de producción
        const fScale = ScalingCalculator.getFontScale(zoom);
        const renderedFontSize = baseFontSize * fScale;

        // Cálculo de píxeles físicos: Lo que verían tus ojos
        const physicalPixels = renderedFontSize * zoom;

        console.log(`[REAL TEST] Zoom: ${zoom}, Tamaño Renderizado: ${renderedFontSize.toFixed(2)}px, Píxeles en Pantalla: ${physicalPixels.toFixed(2)}px`);

        // Si esto es < 10, es una "mancha" ilegible.
        expect(physicalPixels).toBeGreaterThanOrEqual(10);
    });

    it('debe proteger la legibilidad a zoom extremo (0.1x)', () => {
        const zoom = 0.1;
        const baseFontSize = 18;
        const fScale = ScalingCalculator.getFontScale(zoom);
        const physicalPixels = (baseFontSize * fScale) * zoom;

        console.log(`[REAL TEST] Zoom: ${zoom}, Píxeles en Pantalla: ${physicalPixels.toFixed(2)}px`);

        // A 10% de zoom, el texto suele desaparecer. Queremos que el sistema lo "infle" para que sea legible.
        expect(physicalPixels).toBeGreaterThanOrEqual(10);
    });
});
