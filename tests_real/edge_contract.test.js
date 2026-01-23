import { describe, it, expect } from 'vitest';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

/**
 * TEST DE SALUD REAL: Contrato de Bordes (Edge Contract)
 * Verifica que el punto de conexión calculado esté EXACTAMENTE en el borde del nodo.
 * Si esto falla, las líneas se ven "flotando" o "atravesando" los nodos a bajo zoom.
 */
describe('Salud Crítica: Contrato de Bordes', () => {

    it('debe calcular el punto del borde exacto para un nodo circular (1x zoom)', () => {
        const node = { id: 'n1', x: 0, y: 0 };
        const target = { x: 100, y: 0 };
        const zoom = 1.0;

        // El radio base suele ser 35px
        const radius = GeometryUtils.getNodeRadius(node, zoom);
        const edge = GeometryUtils.getEdgePoint(node, target.x, target.y, {}, { zoomScale: zoom });

        // A la derecha (target x=100), el borde debe ser x=radius, y=0
        expect(edge.x).toBeCloseTo(radius, 1);
        expect(edge.y).toBe(0);

        // La distancia del centro al borde debe ser exactamente el radio
        const dist = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
        expect(dist).toBeCloseTo(radius, 1);
    });

    it('debe mantener la integridad del borde a zoom 0.1x (con inflación)', () => {
        const node = { id: 'n1', x: 0, y: 0 };
        const target = { x: 1000, y: 0 };
        const zoom = 0.1;

        const radius = GeometryUtils.getNodeRadius(node, zoom);
        const edge = GeometryUtils.getEdgePoint(node, target.x, target.y, {}, { zoomScale: zoom });

        const dist = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
        expect(dist).toBeCloseTo(radius, 1);

        // A zoom 0.1, el radio inflado debería ser mayor al 10% del radio base
        // (Si el radio base es 35, el 10% es 3.5, pero con inflación debería ser ~12-14)
        expect(radius).toBeGreaterThan(4);
    });

    it('debe calcular el borde correcto para un BOX (StickyNote)', () => {
        const node = {
            id: 's1', x: 0, y: 0,
            isStickyNote: true,
            dimensions: { w: 200, h: 100 }
        };
        const target = { x: 500, y: 0 }; // A la derecha
        const zoom = 1.0;

        const edge = GeometryUtils.getEdgePoint(node, target.x, target.y, {}, { zoomScale: zoom });

        // El borde derecho de un box de 200px de ancho está a x=100
        expect(edge.x).toBeCloseTo(100, 1);
        expect(edge.y).toBe(0);
    });
});
