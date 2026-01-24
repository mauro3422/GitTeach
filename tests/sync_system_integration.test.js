// tests/sync_system_integration.test.js
// Test para verificar la integración del sistema de sincronización lógica-visual

import { describe, it, expect, beforeEach } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler.js';
import { DimensionSync } from '../src/renderer/js/views/pipeline/designer/DimensionSync.js';

describe('LV-Sync System Integration Test', () => {
    let canvas;
    let resizeHandler;

    beforeEach(() => {
        canvas = document.createElement('canvas');
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
            navigation: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });

        // Inicializar el resize handler con un controlador simulado
        const mockController = {
            nodes: DesignerStore.state.nodes,
            state: { zoomScale: 1.0 },
            screenToWorld: (pos) => pos,
            getMousePos: (e) => ({ x: e.clientX, y: e.clientY })
        };

        resizeHandler = new ResizeHandler(mockController);
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

    it('should detect resize handles accurately using synchronized dimensions', () => {
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
        const cornerX = dims.centerX + dims.w / 2;
        const cornerY = dims.centerY + dims.h / 2;
        const worldPos = { x: cornerX, y: cornerY };

        // Verificar que el resize handler detecte el handle en la posición correcta
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(['se']).toContain(hit.corner); // southeast corner
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

    it('should maintain handle detection accuracy for both containers and sticky notes simultaneously', () => {
        const container = {
            id: 'sync-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
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

        // Probar detección de handles para ambos tipos de nodos
        const containerDims = DimensionSync.getSyncDimensions(container, DesignerStore.state.nodes, 1.0);
        const containerCornerX = containerDims.centerX + containerDims.w / 2;
        const containerCornerY = containerDims.centerY + containerDims.h / 2;
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });

        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);

        const stickyDims = DimensionSync.getSyncDimensions(stickyNote, DesignerStore.state.nodes, 1.0);
        const stickyCornerX = stickyDims.centerX + stickyDims.w / 2;
        const stickyCornerY = stickyDims.centerY + stickyDims.h / 2;
        const stickyHit = resizeHandler.findResizeHandle({ x: stickyCornerX, y: stickyCornerY });

        expect(stickyHit).not.toBeNull();
        expect(stickyHit.nodeId).toBe(stickyNote.id);
    });
});