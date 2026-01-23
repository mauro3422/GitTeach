// tests/sync_verification.test.js
// Test simple para verificar que el sistema de sincronización funcione

import { describe, it, expect, beforeEach } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

describe('Synchronization System Verification', () => {
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

        // Crear un controlador simulado para el resize handler
        const mockController = {
            nodes: DesignerStore.state.nodes,
            state: { zoomScale: 1.0 },
            screenToWorld: (pos) => pos,
            getMousePos: (e) => ({ x: e.clientX, y: e.clientY })
        };

        resizeHandler = new ResizeHandler(mockController);
    });

    it('should detect resize handles accurately for sticky notes with text content', () => {
        const node = {
            id: 'sync-verification-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Synchronization verification text',
            dimensions: { w: 200, h: 150, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Calcular la posición de la esquina SE usando el sistema de dimensiones visuales
        const bounds = GeometryUtils.getStickyNoteBounds(node, null, 1.0);
        const cornerX = (bounds.centerX || node.x) + (bounds.renderW || bounds.w) / 2;
        const cornerY = (bounds.centerY || node.y) + (bounds.renderH || bounds.h) / 2;
        const worldPos = { x: cornerX, y: cornerY };

        // Verificar que el sistema detecte el handle de redimensionamiento
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(['se']).toContain(hit.corner); // southeast corner
    });

    it('should detect resize handles accurately for containers', () => {
        const node = {
            id: 'sync-verification-container',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 250, h: 200, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Calcular la posición de la esquina SE usando el sistema de dimensiones visuales
        const bounds = GeometryUtils.getContainerBounds(node, DesignerStore.state.nodes, 1.0);
        const cornerX = (bounds.centerX || node.x) + (bounds.renderW || bounds.w) / 2;
        const cornerY = (bounds.centerY || node.y) + (bounds.renderH || bounds.h) / 2;
        const worldPos = { x: cornerX, y: cornerY };

        // Verificar que el sistema detecte el handle de redimensionamiento
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(['se']).toContain(hit.corner); // southeast corner
    });

    it('should maintain accuracy when both node types are present', () => {
        const container = {
            id: 'mixed-sync-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        const stickyNote = {
            id: 'mixed-sync-sticky',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'Mixed sync test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[container.id] = container;
        DesignerStore.state.nodes[stickyNote.id] = stickyNote;

        // Probar detección para el contenedor
        const containerBounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const containerCornerX = (containerBounds.centerX || container.x) + (containerBounds.renderW || containerBounds.w) / 2;
        const containerCornerY = (containerBounds.centerY || container.y) + (containerBounds.renderH || containerBounds.h) / 2;
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });

        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);

        // Probar detección para el sticky note
        const stickyBounds = GeometryUtils.getStickyNoteBounds(stickyNote, null, 1.0);
        const stickyCornerX = (stickyBounds.centerX || stickyNote.x) + (stickyBounds.renderW || stickyBounds.w) / 2;
        const stickyCornerY = (stickyBounds.centerY || stickyNote.y) + (stickyBounds.renderH || stickyBounds.h) / 2;
        const stickyHit = resizeHandler.findResizeHandle({ x: stickyCornerX, y: stickyCornerY });

        expect(stickyHit).not.toBeNull();
        expect(stickyHit.nodeId).toBe(stickyNote.id);
    });

    it('should work correctly at different zoom levels', () => {
        const node = {
            id: 'zoom-sync-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Zoom sync test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Probar en diferentes niveles de zoom
        const zoomLevels = [0.5, 1.0, 2.0];

        for (const zoom of zoomLevels) {
            // Actualizar el zoom en el store simulado
            const mockControllerWithZoom = {
                nodes: DesignerStore.state.nodes,
                state: { zoomScale: zoom },
                screenToWorld: (pos) => pos,
                getMousePos: (e) => ({ x: e.clientX, y: e.clientY }),
                canvas: canvas
            };

            const zoomedResizeHandler = new ResizeHandler(mockControllerWithZoom);

            // Calcular la posición de la esquina SE con el zoom actual
            const bounds = GeometryUtils.getStickyNoteBounds(node, null, zoom);
            const cornerX = (bounds.centerX || node.x) + (bounds.renderW || bounds.w) / 2;
            const cornerY = (bounds.centerY || node.y) + (bounds.renderH || bounds.h) / 2;
            const worldPos = { x: cornerX, y: cornerY };

            const hit = zoomedResizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
        }
    });
});