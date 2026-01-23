import { describe, it, expect, vi } from 'vitest';
import { RoutingDesigner } from '../src/renderer/js/views/pipeline/designer/DesignerController.js';

/**
 * TEST DE SALUD REAL: Integridad de Renderizado (Batching)
 * Verifica que el sistema no dibuje excesivamente (over-rendering).
 * El DesignerController debe usar RAF para agrupar actualizaciones.
 */
describe('Salud Crítica: Integridad de Renderizado', () => {

    it('debe agrupar múltiples llamadas a render() en un solo frame de ejecución', async () => {
        // Espiamos el método de ejecución interna
        const executeSpy = vi.spyOn(RoutingDesigner, '_executeRender');

        // Disparamos 10 renders seguidos
        RoutingDesigner.render();
        RoutingDesigner.render();
        RoutingDesigner.render();
        RoutingDesigner.render();
        RoutingDesigner.render();

        // En este punto, no debería haberse ejecutado ninguno todavía (están encolados en RAF)
        expect(executeSpy).toHaveBeenCalledTimes(0);

        // Esperamos a que pase el siguiente frame
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Debería haberse ejecutado exactamente 1 vez (batching exitoso)
        expect(executeSpy).toHaveBeenCalledTimes(1);

        executeSpy.mockRestore();
    });
});
