// tests_real/sticky_note_resize_accuracy.test.js
// Tests para verificar la precisión de redimensionamiento de sticky notes
// con contenido de texto que afecta las dimensiones visuales

import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

/**
 * Sticky Note Resize Accuracy Test
 *
 * Verifies that resize handles are detected accurately for sticky notes
 * with varying text content that affects visual dimensions
 */
describe('Sticky Note Resize Accuracy', () => {
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

    it('should detect resize handles accurately for sticky notes with short text', () => {
        const node = {
            id: 'sticky-short-text',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Hi',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        DesignerStore.state.nodes[node.id] = node;

        // Get the visual bounds for this sticky note
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

    it('should detect resize handles accurately for sticky notes with long text', () => {
        const node = {
            id: 'sticky-long-text',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'This is a very long text that should affect the visual dimensions of the sticky note significantly',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        DesignerStore.state.nodes[node.id] = node;

        // Get the visual bounds for this sticky note (will be larger due to text)
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

    it('should detect resize handles accurately for sticky notes with multiline text', () => {
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

    it('should detect resize handles accurately for sticky notes at different zoom levels', () => {
        const node = {
            id: 'sticky-zoom-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Zoom test text',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        DesignerStore.state.nodes[node.id] = node;

        // Test at low zoom
        DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 0.5 });

        const bounds = GeometryUtils.getStickyNoteBounds(node, null, 0.5);
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;

        // Calculate corner position based on visual dimensions at this zoom level
        const cornerX = visualCenterX + visualW / 2;
        const cornerY = visualCenterY + visualH / 2;

        // Test detection at corner position
        const worldPos = { x: cornerX, y: cornerY };
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(['se']).toContain(hit.corner); // bottom-right corner
    });

    it('should distinguish between container and sticky note handles correctly', () => {
        // Create both a container and a sticky note
        const container = {
            id: 'test-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        const stickyNote = {
            id: 'test-sticky',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'Sticky note text',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        DesignerStore.state.nodes = { [container.id]: container, [stickyNote.id]: stickyNote };

        // Get visual bounds for both nodes
        const containerBounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const stickyBounds = GeometryUtils.getStickyNoteBounds(stickyNote, null, 1.0);

        // Calculate corner positions based on visual dimensions
        const containerCornerX = containerBounds.centerX + containerBounds.renderW / 2;
        const containerCornerY = containerBounds.centerY + containerBounds.renderH / 2;
        const stickyCornerX = stickyBounds.centerX + stickyBounds.renderW / 2;
        const stickyCornerY = stickyBounds.centerY + stickyBounds.renderH / 2;

        // Test detection for container
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });
        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);

        // Test detection for sticky note
        const stickyHit = resizeHandler.findResizeHandle({ x: stickyCornerX, y: stickyCornerY });
        expect(stickyHit).not.toBeNull();
        expect(stickyHit.nodeId).toBe(stickyNote.id);
    });
});