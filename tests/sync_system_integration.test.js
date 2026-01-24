// tests/sync_system_integration.test.js
// Test para verificar la integración del sistema de sincronización lógica-visual

import { describe, it, expect, beforeEach } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler.js';
import { DimensionSync } from '../src/renderer/js/views/pipeline/designer/DimensionSync.js';

describe('LV-Sync System Integration Test', () => {
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

    it('should provide consistent dimensions for sticky notes across logical and visual systems', () => {
        const node = {
            id: 'sync-test-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Test text for synchronization',
            dimensions: { w: 200, h: 150, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Obtener dimensiones sincronizadas
        const dims = DimensionSync.getSyncDimensions(node, DesignerStore.state.nodes, 1.0);

        // Verificar que las dimensiones tengan valores razonables
        expect(dims.centerX).toBeCloseTo(node.x);
        expect(dims.centerY).toBeCloseTo(node.y);
        expect(dims.w).toBeGreaterThan(0);
        expect(dims.h).toBeGreaterThan(0);
    });

    it('should provide consistent dimensions for containers across logical and visual systems', () => {
        const node = {
            id: 'sync-test-container',
            x: 100,
            y: 100,
            isRepoContainer: true,
            dimensions: { w: 300, h: 200, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Obtener dimensiones sincronizadas
        const dims = DimensionSync.getSyncDimensions(node, DesignerStore.state.nodes, 1.0);

        // Verificar que las dimensiones tengan valores razonables
        expect(dims.centerX).toBeCloseTo(node.x);
        expect(dims.centerY).toBeCloseTo(node.y);
        expect(dims.w).toBeGreaterThan(0);
        expect(dims.h).toBeGreaterThan(0);
    });

    it('should provide handle positions using synchronized dimensions', () => {
        const node = {
            id: 'sync-handle-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Synchronization test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Obtener dimensiones sincronizadas para calcular la posición de la esquina
        const dims = DimensionSync.getSyncDimensions(node, DesignerStore.state.nodes, 1.0);
        const corners = DimensionSync.getHandleCorners(node, DesignerStore.state.nodes, 1.0);

        // Verificar que los corners se calculen correctamente
        expect(corners).toHaveLength(4);

        // SE corner (index 3) debería estar en la esquina inferior-derecha
        const seCorner = corners[3];
        expect(seCorner.x).toBeGreaterThan(dims.centerX);
        expect(seCorner.y).toBeGreaterThan(dims.centerY);
    });

    it('should maintain consistency across different zoom levels', () => {
        const node = {
            id: 'zoom-sync-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Zoom test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Probar en diferentes niveles de zoom
        const zoomLevels = [0.5, 1.0, 2.0, 3.0];

        for (const zoom of zoomLevels) {
            const dims = DimensionSync.getSyncDimensions(node, DesignerStore.state.nodes, zoom);

            // Verificar que las dimensiones sean consistentes en todos los niveles de zoom
            expect(dims.centerX).toBeCloseTo(node.x);
            expect(dims.centerY).toBeCloseTo(node.y);
            expect(dims.w).toBeGreaterThan(0);
            expect(dims.h).toBeGreaterThan(0);
        }
    });

    it('should work correctly with different text lengths affecting visual dimensions', () => {
        const shortNode = {
            id: 'short-text-sync',
            x: -100,
            y: 0,
            isStickyNote: true,
            text: 'Short',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const longNode = {
            id: 'long-text-sync',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'This is a much longer text that should result in different visual dimensions compared to the short text node',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { [shortNode.id]: shortNode, [longNode.id]: longNode };

        // Obtener dimensiones sincronizadas para ambos nodos
        const shortDims = DimensionSync.getSyncDimensions(shortNode, DesignerStore.state.nodes, 1.0);
        const longDims = DimensionSync.getSyncDimensions(longNode, DesignerStore.state.nodes, 1.0);

        // El nodo con texto largo debería tener dimensiones más anchas
        expect(longDims.w).toBeGreaterThanOrEqual(shortDims.w);

        // Ambos deberían tener la misma posición central
        expect(shortDims.centerX).toBeCloseTo(shortNode.x);
        expect(shortDims.centerY).toBeCloseTo(shortNode.y);
        expect(longDims.centerX).toBeCloseTo(longNode.x);
        expect(longDims.centerY).toBeCloseTo(longNode.y);
    });

    it('should maintain dimension consistency for both containers and sticky notes simultaneously', () => {
        const container = {
            id: 'sync-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
            label: 'Test Container',
            dimensions: { w: 250, h: 150, isManual: true }
        };

        const stickyNote = {
            id: 'sync-sticky',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'Sync test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { [container.id]: container, [stickyNote.id]: stickyNote };

        // Verificar dimensiones sincronizadas para ambos tipos de nodos
        const containerDims = DimensionSync.getSyncDimensions(container, DesignerStore.state.nodes, 1.0);
        const containerCorners = DimensionSync.getHandleCorners(container, DesignerStore.state.nodes, 1.0);

        expect(containerDims.w).toBeGreaterThan(0);
        expect(containerDims.h).toBeGreaterThan(0);
        expect(containerCorners).toHaveLength(4);

        const stickyDims = DimensionSync.getSyncDimensions(stickyNote, DesignerStore.state.nodes, 1.0);
        const stickyCorners = DimensionSync.getHandleCorners(stickyNote, DesignerStore.state.nodes, 1.0);

        expect(stickyDims.w).toBeGreaterThan(0);
        expect(stickyDims.h).toBeGreaterThan(0);
        expect(stickyCorners).toHaveLength(4);

        // Container and sticky note should be separated
        expect(containerDims.centerX).toBeLessThan(stickyDims.centerX);
    });
});