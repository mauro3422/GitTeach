// tests/visual_resize_test.test.js
// Test para verificar que la detección de handles funciona correctamente con dimensiones visuales

import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

describe('Visual Resize Handle Detection Test', () => {
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

    it('should detect handles based on visual dimensions for sticky notes with long text', () => {
        const node = {
            id: 'long-text-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'EXTREMELY_LONG_WORD_TO_FORCE_WIDTH_INCREASE',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Obtener los bounds visuales para este sticky note
        const bounds = GeometryUtils.getStickyNoteBounds(node, null, 1.0);

        // Las dimensiones visuales pueden ser diferentes a las lógicas debido al texto
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;

        // Calcular la esquina SE basada en dimensiones visuales
        const cornerX = visualCenterX + visualW / 2;
        const cornerY = visualCenterY + visualH / 2;
        const worldPos = { x: cornerX, y: cornerY };

        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(hit.corner).toBe('se');
    });

    it('should detect handles based on visual dimensions for sticky notes with multiline text', () => {
        const node = {
            id: 'multiline-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Line 1\nLine 2\nLine 3\nThis is a longer line that might wrap',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Obtener los bounds visuales para este sticky note multilinea
        const bounds = GeometryUtils.getStickyNoteBounds(node, null, 1.0);

        // Este sticky note debería ser más alto debido a las múltiples líneas
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;

        // Calcular la esquina SE basada en dimensiones visuales
        const cornerX = visualCenterX + visualW / 2;
        const cornerY = visualCenterY + visualH / 2;
        const worldPos = { x: cornerX, y: cornerY };

        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(hit.corner).toBe('se');
    });

    it('should still work correctly for containers', () => {
        const node = {
            id: 'test-container',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        DesignerStore.state.nodes[node.id] = node;

        // Para contenedores, usar los bounds del contenedor
        const bounds = GeometryUtils.getContainerBounds(node, DesignerStore.state.nodes, 1.0);
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;

        // Calcular la esquina SE basada en dimensiones visuales
        const cornerX = visualCenterX + visualW / 2;
        const cornerY = visualCenterY + visualH / 2;
        const worldPos = { x: cornerX, y: cornerY };

        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(hit.corner).toBe('se');
    });

    it('should distinguish between different sticky notes with different visual sizes', () => {
        const shortSticky = {
            id: 'short-sticky',
            x: -150,
            y: 0,
            isStickyNote: true,
            text: 'Short',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const longSticky = {
            id: 'long-sticky',
            x: 150,
            y: 0,
            isStickyNote: true,
            text: 'LONG_WORD_FOR_WIDTH_INCREASE',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[shortSticky.id] = shortSticky;
        DesignerStore.state.nodes[longSticky.id] = longSticky;

        // Obtener los bounds visuales para ambos sticky notes
        const shortBounds = GeometryUtils.getStickyNoteBounds(shortSticky, null, 1.0);
        const longBounds = GeometryUtils.getStickyNoteBounds(longSticky, null, 1.0);

        // El sticky note con texto largo debería tener dimensiones visuales más anchas
        expect(longBounds.renderW).toBeGreaterThan(shortBounds.renderW);

        // Calcular las esquinas SE basadas en dimensiones visuales
        const shortCornerX = shortBounds.centerX + shortBounds.renderW / 2;
        const shortCornerY = shortBounds.centerY + shortBounds.renderH / 2;
        const longCornerX = longBounds.centerX + longBounds.renderW / 2;
        const longCornerY = longBounds.centerY + longBounds.renderH / 2;

        // Ambos deberían detectar handles correctamente
        const shortHit = resizeHandler.findResizeHandle({ x: shortCornerX, y: shortCornerY });
        const longHit = resizeHandler.findResizeHandle({ x: longCornerX, y: longCornerY });

        expect(shortHit).not.toBeNull();
        expect(shortHit.nodeId).toBe(shortSticky.id);
        expect(longHit).not.toBeNull();
        expect(longHit.nodeId).toBe(longSticky.id);
    });
});