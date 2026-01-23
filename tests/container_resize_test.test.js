// tests/container_resize_test.test.js
// Test específico para verificar que el sistema de redimensionamiento funcione para containers

import { describe, it, expect, beforeEach } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

describe('Container Resize Functionality Test', () => {
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
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });

        // Crear un controlador simulado para el resize handler
        const mockController = {
            get nodes() { return DesignerStore.state.nodes; },
            state: { zoomScale: 1.0 },
            screenToWorld: (pos) => pos,
            getMousePos: (e) => ({ x: e.clientX, y: e.clientY })
        };

        resizeHandler = new ResizeHandler(mockController);
    });

    it('should detect resize handles for containers', () => {
        const container = {
            id: 'test-container',
            x: 0,
            y: 0,
            isRepoContainer: true,  // Este es un container, no un sticky note
            dimensions: { w: 250, h: 200, isManual: true }
        };

        DesignerStore.state.nodes[container.id] = container;

        // Calcular la posición de la esquina SE usando la lógica de dimensiones
        // Como no podemos usar DimensionSync, usaremos la lógica directa del sistema
        const bounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const centerX = bounds.centerX || container.x;
        const centerY = bounds.centerY || container.y;
        const w = (bounds.renderW || bounds.w || container.dimensions.w);
        const h = (bounds.renderH || bounds.h || container.dimensions.h);

        // Calcular la esquina SE
        const cornerX = centerX + w / 2;
        const cornerY = centerY + h / 2;
        const worldPos = { x: cornerX, y: cornerY };

        // Verificar que el sistema detecte el handle de redimensionamiento
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(container.id);
        expect(['se']).toContain(hit.corner); // southeast corner
    });

    it('should work for both containers and sticky notes simultaneously', () => {
        const container = {
            id: 'simultaneous-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        const stickyNote = {
            id: 'simultaneous-sticky',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'Simultaneous test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { [container.id]: container, [stickyNote.id]: stickyNote };

        // Probar detección para container
        const containerBounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const containerCenterX = containerBounds.centerX || container.x;
        const containerCenterY = containerBounds.centerY || container.y;
        const containerW = (containerBounds.renderW || containerBounds.w || container.dimensions.w);
        const containerH = (containerBounds.renderH || containerBounds.h || container.dimensions.h);
        const containerCornerX = containerCenterX + containerW / 2;
        const containerCornerY = containerCenterY + containerH / 2;
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });

        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);

        // Probar detección para sticky note
        const stickyBounds = GeometryUtils.getStickyNoteBounds(stickyNote, null, 1.0);
        const stickyCenterX = stickyBounds.centerX || stickyNote.x;
        const stickyCenterY = stickyBounds.centerY || stickyNote.y;
        const stickyW = (stickyBounds.renderW || stickyBounds.w || stickyNote.dimensions.w);
        const stickyH = (stickyBounds.renderH || stickyBounds.h || stickyNote.dimensions.h);
        const stickyCornerX = stickyCenterX + stickyW / 2;
        const stickyCornerY = stickyCenterY + stickyH / 2;
        const stickyHit = resizeHandler.findResizeHandle({ x: stickyCornerX, y: stickyCornerY });

        expect(stickyHit).not.toBeNull();
        expect(stickyHit.nodeId).toBe(stickyNote.id);
    });
});