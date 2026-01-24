// tests/final_sync_verification.test.js
// Test final para verificar que el sistema de sincronización funcione correctamente

import { describe, it, expect, beforeEach } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { DimensionSync } from '../src/renderer/js/views/pipeline/designer/DimensionSync';

describe('Final Synchronization Verification', () => {
    beforeEach(() => {
        const canvas = document.createElement('canvas');
        canvas.id = 'designer-canvas';
        canvas.width = 1920;
        canvas.height = 1080;
        document.body.appendChild(canvas);

        const container = document.createElement('div');
        container.id = 'designer-container';
        document.body.appendChild(container);

        DesignerStore.setState({
            nodes: {},
            connections: [],
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });
    });

    it('should use DimensionSync to get consistent visual dimensions', () => {
        const node = {
            id: 'final-sync-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Final synchronization test',
            dimensions: { w: 200, h: 150, isManual: true }
        };

        // Verificar que DimensionSync funcione correctamente
        const dims = DimensionSync.getVisualDimensions(node, 1.0, DesignerStore.state.nodes);

        // Verificar que las dimensiones tengan valores razonables
        expect(dims.centerX).toBeCloseTo(node.x);
        expect(dims.centerY).toBeCloseTo(node.y);
        expect(dims.logicalW).toBeGreaterThan(0);
        expect(dims.logicalH).toBeGreaterThan(0);
        expect(dims.visualW).toBeGreaterThan(0);
        expect(dims.visualH).toBeGreaterThan(0);
    });

    it('should calculate handle positions consistently with visual dimensions', () => {
        const node = {
            id: 'handle-position-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Handle position test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Usar DimensionSync para calcular la posición del handle
        const handlePos = DimensionSync.getVisualHandlePosition(node, 'se', 1.0, DesignerStore.state.nodes);

        // Verificar que la posición del handle tenga valores válidos
        expect(handlePos.x).toBeGreaterThan(node.x - 200); // Debe estar cerca del nodo
        expect(handlePos.x).toBeLessThan(node.x + 200);
        expect(handlePos.y).toBeGreaterThan(node.y - 150);
        expect(handlePos.y).toBeLessThan(node.y + 150);
    });

    it('should validate sync between logical and visual representations', () => {
        const node = {
            id: 'sync-validation-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Sync validation test with longer text that affects visual dimensions',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        // Verificar que la validación de sincronización funcione
        const isValid = DimensionSync.validateSync(node, 1.0, DesignerStore.state.nodes);
        expect(isValid).toBe(true);
    });

    it('should work correctly with containers as well', () => {
        const node = {
            id: 'container-sync-test',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 250, h: 200, isManual: true }
        };

        // Verificar que DimensionSync funcione correctamente con contenedores
        const dims = DimensionSync.getVisualDimensions(node, 1.0, DesignerStore.state.nodes);

        expect(dims.centerX).toBeCloseTo(node.x);
        expect(dims.centerY).toBeCloseTo(node.y);
        expect(dims.logicalW).toBeGreaterThan(0);
        expect(dims.logicalH).toBeGreaterThan(0);
        expect(dims.visualW).toBeGreaterThan(0);
        expect(dims.visualH).toBeGreaterThan(0);
    });
});