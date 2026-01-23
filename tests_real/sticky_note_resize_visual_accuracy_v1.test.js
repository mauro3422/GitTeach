// tests_real/sticky_note_resize_visual_accuracy.test.js
// Tests para verificar la precisión de redimensionamiento de sticky notes
// usando dimensiones visuales en lugar de lógicas

// Importar solo los módulos del proyecto, no las funciones de Vitest
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

// Este test se ejecutará con globals: true, por lo que describe, it, expect están disponibles globalmente

describe('Sticky Note Visual Resize Accuracy', () => {
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

    it('should detect resize handles based on visual dimensions for sticky notes with text', () => {
        const node = {
            id: 'sticky-with-text',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'This text affects visual size',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        DesignerStore.state.nodes[node.id] = node;

        // Get the visual bounds for this sticky note (affected by text content)
        const bounds = GeometryUtils.getStickyNoteBounds(node, null, 1.0);
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;

        // Calculate corner position based on visual dimensions (not logical dimensions)
        const cornerX = visualCenterX + visualW / 2;
        const cornerY = visualCenterY + visualH / 2;

        // Test detection at corner position - should find the handle because we're using visual dimensions
        const worldPos = { x: cornerX, y: cornerY };
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(['se']).toContain(hit.corner); // bottom-right corner
    });

    it('should detect handles differently for sticky notes with different text lengths', () => {
        const shortNode = {
            id: 'sticky-short',
            x: -100,
            y: 0,
            isStickyNote: true,
            text: 'Short',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const longNode = {
            id: 'sticky-long',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'LONG_WORD_FOR_WIDTH_INCREASE',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes[shortNode.id] = shortNode;
        DesignerStore.state.nodes[longNode.id] = longNode;

        // Get visual bounds for both nodes
        const shortBounds = GeometryUtils.getStickyNoteBounds(shortNode, null, 1.0);
        const longBounds = GeometryUtils.getStickyNoteBounds(longNode, null, 1.0);

        // The long text node should have wider visual dimensions
        expect(longBounds.renderW).toBeGreaterThan(shortBounds.renderW);

        // Calculate corner positions based on their respective visual dimensions
        const shortCornerX = shortBounds.centerX + shortBounds.renderW / 2;
        const shortCornerY = shortBounds.centerY + shortBounds.renderH / 2;
        const longCornerX = longBounds.centerX + longBounds.renderW / 2;
        const longCornerY = longBounds.centerY + longBounds.renderH / 2;

        // Both should detect handles at their visual corners
        const shortHit = resizeHandler.findResizeHandle({ x: shortCornerX, y: shortCornerY });
        const longHit = resizeHandler.findResizeHandle({ x: longCornerX, y: longCornerY });

        expect(shortHit).not.toBeNull();
        expect(shortHit.nodeId).toBe(shortNode.id);
        expect(longHit).not.toBeNull();
        expect(longHit.nodeId).toBe(longNode.id);
    });

    it('should work correctly for sticky notes with multiline text', () => {
        const node = {
            id: 'sticky-multiline',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Line 1\nLine 2\nLine 3\nThis is a longer line that might wrap',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        DesignerStore.state.nodes[node.id] = node;

        // Get the visual bounds for this sticky note (will be taller due to multiple lines)
        const bounds = GeometryUtils.getStickyNoteBounds(node, null, 1.0);
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;

        // Calculate corner position based on visual dimensions
        const cornerX = visualCenterX + visualW / 2;
        const cornerY = visualCenterY + visualH / 2;

        // Test detection at corner position
        const worldPos = { x: cornerX, y: cornerY };
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(['se']).toContain(hit.corner); // bottom-right corner
    });
});