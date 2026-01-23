// tests/sticky_note_visual_resize.test.js
// Test para verificar que la solución de usar dimensiones visuales para handles funciona

import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

describe('Sticky Note Visual Resize Solution Verification', () => {
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

    it('should detect handles based on visual dimensions rather than logical dimensions', () => {
        const node = {
            id: 'test-sticky-visual',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Long text that affects visual dimensions',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        DesignerStore.state.nodes[node.id] = node;

        // Get visual bounds as calculated by GeometryUtils
        const bounds = GeometryUtils.getStickyNoteBounds(node, null, 1.0);
        
        // The visual dimensions may differ from logical dimensions due to text content
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;
        const logicalW = node.dimensions.w;
        const logicalH = node.dimensions.h;
        
        // For nodes with substantial text, visual and logical dimensions may differ
        // Our solution should use visual dimensions for handle placement
        
        // Calculate corner based on visual center and visual dimensions
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;
        const cornerX = visualCenterX + visualW / 2;
        const cornerY = visualCenterY + visualH / 2;
        
        // The handle should be detected at the visual corner
        const worldPos = { x: cornerX, y: cornerY };
        const hit = resizeHandler.findResizeHandle(worldPos);

        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe(node.id);
        expect(['se']).toContain(hit.corner); // bottom-right corner
    });

    it('should work consistently for both containers and sticky notes', () => {
        // Create both types of nodes
        const container = {
            id: 'test-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };
        
        const stickyNote = {
            id: 'test-sticky-consistency',
            x: 100,
            y: 0,
            isStickyNote: true,
            text: 'Test text',
            dimensions: { w: 180, h: 100, isManual: true }
        };
        
        DesignerStore.state.nodes = { [container.id]: container, [stickyNote.id]: stickyNote };

        // Both should have handles detected at their visual boundaries
        const containerBounds = GeometryUtils.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const stickyBounds = GeometryUtils.getStickyNoteBounds(stickyNote, null, 1.0);

        // Calculate visual corners for both
        const containerCornerX = containerBounds.centerX + containerBounds.renderW / 2;
        const containerCornerY = containerBounds.centerY + containerBounds.renderH / 2;
        const stickyCornerX = stickyBounds.centerX + stickyBounds.renderW / 2;
        const stickyCornerY = stickyBounds.centerY + stickyBounds.renderH / 2;

        // Both should detect handles
        const containerHit = resizeHandler.findResizeHandle({ x: containerCornerX, y: containerCornerY });
        const stickyHit = resizeHandler.findResizeHandle({ x: stickyCornerX, y: stickyCornerY });

        expect(containerHit).not.toBeNull();
        expect(containerHit.nodeId).toBe(container.id);
        expect(stickyHit).not.toBeNull();
        expect(stickyHit.nodeId).toBe(stickyNote.id);
    });
});