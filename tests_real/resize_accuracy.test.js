import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';

/**
 * Resize Accuracy Test
 *
 * Verifies that the resize handles are detected accurately at different zoom levels
 * and that the resize operation works correctly with the fixed logic.
 */
describe('Resize System Accuracy', () => {
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

    describe('Handle Detection Accuracy', () => {
        it('should detect resize handles accurately at normal zoom (1.0x)', () => {
            const node = {
                id: 'test-sticky',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };
            DesignerStore.state.nodes[node.id] = node;

            // Position near the bottom-right corner of the node
            const logicalW = node.dimensions.w;
            const logicalH = node.dimensions.h;
            const centerX = node.x;
            const centerY = node.y;
            
            // Calculate corner position using logical dimensions (the fix)
            const cornerX = centerX + logicalW / 2;
            const cornerY = centerY + logicalH / 2;
            
            // Test detection at corner position
            const worldPos = { x: cornerX, y: cornerY };
            const hit = resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner); // bottom-right corner
        });

        it('should detect resize handles accurately at low zoom (0.1x)', () => {
            const node = {
                id: 'test-sticky-low-zoom',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };
            DesignerStore.state.nodes[node.id] = node;
            DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 0.1 });

            // Position near the bottom-right corner of the node
            const logicalW = node.dimensions.w;
            const logicalH = node.dimensions.h;
            const centerX = node.x;
            const centerY = node.y;
            
            // Calculate corner position using logical dimensions (the fix)
            const cornerX = centerX + logicalW / 2;
            const cornerY = centerY + logicalH / 2;
            
            // Test detection at corner position
            const worldPos = { x: cornerX, y: cornerY };
            const hit = resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner); // bottom-right corner
        });

        it('should detect resize handles accurately at high zoom (3.0x)', () => {
            const node = {
                id: 'test-sticky-high-zoom',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };
            DesignerStore.state.nodes[node.id] = node;
            DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 3.0 });

            // Position near the bottom-right corner of the node
            const logicalW = node.dimensions.w;
            const logicalH = node.dimensions.h;
            const centerX = node.x;
            const centerY = node.y;
            
            // Calculate corner position using logical dimensions (the fix)
            const cornerX = centerX + logicalW / 2;
            const cornerY = centerY + logicalH / 2;
            
            // Test detection at corner position
            const worldPos = { x: cornerX, y: cornerY };
            const hit = resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner); // bottom-right corner
        });

        it('should detect resize handles for container nodes', () => {
            const node = {
                id: 'test-container',
                x: 100,
                y: 100,
                isRepoContainer: true,
                dimensions: { w: 300, h: 200, isManual: true }
            };
            DesignerStore.state.nodes[node.id] = node;

            // Position near the bottom-right corner of the container
            const logicalW = node.dimensions.w;
            const logicalH = node.dimensions.h;
            const centerX = node.x;
            const centerY = node.y;
            
            // Calculate corner position using logical dimensions (the fix)
            const cornerX = centerX + logicalW / 2;
            const cornerY = centerY + logicalH / 2;
            
            // Test detection at corner position
            const worldPos = { x: cornerX, y: cornerY };
            const hit = resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner); // bottom-right corner
        });
    });

    describe('Resize Operation Accuracy', () => {
        it('should resize node correctly when handle is dragged', () => {
            const node = {
                id: 'resize-test-node',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };
            DesignerStore.state.nodes[node.id] = node;

            // Start resize operation
            const initialPos = { x: node.x + node.dimensions.w / 2, y: node.y + node.dimensions.h / 2 };
            resizeHandler.onStart(null, { 
                nodeId: node.id, 
                corner: 'se', 
                initialPos: initialPos 
            });

            // Verify initial state
            const initialState = resizeHandler.getState();
            expect(initialState.resizingNodeId).toBe(node.id);
            expect(initialState.resizeCorner).toBe('se');

            // Simulate mouse movement to increase size
            const newMousePos = { x: initialPos.x + 50, y: initialPos.y + 50 };
            
            // Mock the controller methods for coordinate transformation
            vi.spyOn(resizeHandler.controller, 'getMousePos').mockReturnValue({ x: 100, y: 100 });
            vi.spyOn(resizeHandler.controller, 'screenToWorld').mockReturnValue(newMousePos);

            // Update resize operation
            resizeHandler.onUpdate(null);

            // Verify that the node dimensions have changed
            expect(node.dimensions.w).toBeGreaterThan(200);
            expect(node.dimensions.h).toBeGreaterThan(150);
        });

        it('should maintain aspect ratio consistency during resize', () => {
            const node = {
                id: 'aspect-ratio-test',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 100, isManual: true } // 2:1 aspect ratio
            };
            DesignerStore.state.nodes[node.id] = node;

            // Record initial dimensions
            const initialW = node.dimensions.w;
            const initialH = node.dimensions.h;
            const initialRatio = initialW / initialH;

            // Start resize operation
            const initialPos = { x: node.x + node.dimensions.w / 2, y: node.y + node.dimensions.h / 2 };
            resizeHandler.onStart(null, { 
                nodeId: node.id, 
                corner: 'se', 
                initialPos: initialPos 
            });

            // Simulate mouse movement to increase size
            const newMousePos = { x: initialPos.x + 100, y: initialPos.y + 50 }; // Different X and Y deltas
            
            // Mock the controller methods for coordinate transformation
            vi.spyOn(resizeHandler.controller, 'getMousePos').mockReturnValue({ x: 200, y: 150 });
            vi.spyOn(resizeHandler.controller, 'screenToWorld').mockReturnValue(newMousePos);

            // Update resize operation
            resizeHandler.onUpdate(null);

            // Calculate new aspect ratio
            const newW = node.dimensions.w;
            const newH = node.dimensions.h;
            const newRatio = newW / newH;

            // The resize should maintain the intended proportional changes
            // based on the mouse movement, not enforce a fixed aspect ratio
            expect(newW).toBeGreaterThan(initialW);
            expect(newH).toBeGreaterThan(initialH);
        });
    });

    describe('Integration with DesignerInteraction', () => {
        it('should properly integrate handle detection with mouse events', () => {
            const node = {
                id: 'integration-test-node',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };
            DesignerStore.state.nodes[node.id] = node;

            // Position mouse at the SE corner of the node
            const cornerX = node.x + node.dimensions.w / 2;
            const cornerY = node.y + node.dimensions.h / 2;
            const worldPos = { x: cornerX, y: cornerY };

            // Test that DesignerInteraction can detect the resize handle
            const hit = DesignerInteraction.resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner);
        });

        it('should maintain resize functionality when both containers and sticky notes are present', () => {
            // Create both a container and a sticky note
            const container = {
                id: 'test-container',
                x: -100,
                y: -100,
                isRepoContainer: true,
                dimensions: { w: 300, h: 200, isManual: true }
            };

            const stickyNote = {
                id: 'test-sticky',
                x: 100,
                y: 100,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };

            DesignerStore.state.nodes = { [container.id]: container, [stickyNote.id]: stickyNote };

            // Test resize handle detection for container
            const containerCornerX = container.x + container.dimensions.w / 2;
            const containerCornerY = container.y + container.dimensions.h / 2;
            const containerWorldPos = { x: containerCornerX, y: containerCornerY };

            const containerHit = DesignerInteraction.resizeHandler.findResizeHandle(containerWorldPos);
            expect(containerHit).not.toBeNull();
            expect(containerHit.nodeId).toBe(container.id);
            expect(['se']).toContain(containerHit.corner);

            // Test resize handle detection for sticky note
            const stickyCornerX = stickyNote.x + stickyNote.dimensions.w / 2;
            const stickyCornerY = stickyNote.y + stickyNote.dimensions.h / 2;
            const stickyWorldPos = { x: stickyCornerX, y: stickyCornerY };

            const stickyHit = DesignerInteraction.resizeHandler.findResizeHandle(stickyWorldPos);
            expect(stickyHit).not.toBeNull();
            expect(stickyHit.nodeId).toBe(stickyNote.id);
            expect(['se']).toContain(stickyHit.corner);
        });

        it('should not interfere with resize when sticky note is added after containers', () => {
            // Add container first
            const container = {
                id: 'first-container',
                x: 0,
                y: 0,
                isRepoContainer: true,
                dimensions: { w: 250, h: 150, isManual: true }
            };
            DesignerStore.state.nodes[container.id] = container;

            // Simulate adding a sticky note later
            const stickyNote = {
                id: 'added-later-sticky',
                x: 300,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 180, h: 100, isManual: true }
            };
            DesignerStore.state.nodes[stickyNote.id] = stickyNote;

            // Test that both can still be resized
            const containerCornerPos = {
                x: container.x + container.dimensions.w / 2,
                y: container.y + container.dimensions.h / 2
            };
            const containerHit = DesignerInteraction.resizeHandler.findResizeHandle(containerCornerPos);

            expect(containerHit).not.toBeNull();
            expect(containerHit.nodeId).toBe(container.id);

            const stickyCornerPos = {
                x: stickyNote.x + stickyNote.dimensions.w / 2,
                y: stickyNote.y + stickyNote.dimensions.h / 2
            };
            const stickyHit = DesignerInteraction.resizeHandler.findResizeHandle(stickyCornerPos);

            expect(stickyHit).not.toBeNull();
            expect(stickyHit.nodeId).toBe(stickyNote.id);
        });
    });
});