// tests/simple_resize_test.test.js
// Test simple para verificar que la funcionalidad básica de resize funciona

import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

describe('Simple Resize Functionality Test', () => {
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

        DesignerInteraction.init(canvas, () => DesignerStore.state.nodes, () => { });
        resizeHandler = new ResizeHandler(DesignerInteraction);
    });

    it('should detect resize handle for a basic sticky note', () => {
        const node = {
            id: 'simple-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Simple test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Calcular la posición de la esquina SE usando dimensiones lógicas
        const cornerX = node.x + node.dimensions.w / 2;
        const cornerY = node.y + node.dimensions.h / 2;
        const worldPos = { x: cornerX, y: cornerY };

        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(hit.corner).toBe('se');
    });

    it('should detect resize handle for a basic container', () => {
        const node = {
            id: 'simple-container',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Calcular la posición de la esquina SE usando dimensiones lógicas
        const cornerX = node.x + node.dimensions.w / 2;
        const cornerY = node.y + node.dimensions.h / 2;
        const worldPos = { x: cornerX, y: cornerY };

        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(hit.corner).toBe('se');
    });

    it('should work with multiple nodes of different types', () => {
        const container = {
            id: 'test-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        const sticky = {
            id: 'test-sticky',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'Test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { [container.id]: container, [sticky.id]: sticky };

        // Probar contenedor
        const containerCornerX = container.x + container.dimensions.w / 2;
        const containerCornerY = container.y + container.dimensions.h / 2;
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });

        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);

        // Probar sticky note
        const stickyCornerX = sticky.x + sticky.dimensions.w / 2;
        const stickyCornerY = sticky.y + sticky.dimensions.h / 2;
        const stickyHit = resizeHandler.findResizeHandle({ x: stickyCornerX, y: stickyCornerY });

        expect(stickyHit).not.toBeNull();
        expect(stickyHit.nodeId).toBe(sticky.id);
    });
});