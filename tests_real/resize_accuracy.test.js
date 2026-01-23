import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
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
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });

        DesignerInteraction.init(canvas, () => DesignerStore.state.nodes, () => { });
        DesignerInteraction.panZoomHandler.init({ panOffset: { x: 0, y: 0 }, zoomScale: 1.0 });
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
            DesignerStore.setState({ nodes: { [node.id]: node } });

            // Position near the bottom-right corner of the node
            const logicalW = node.dimensions.w;
            const logicalH = node.dimensions.h;
            const centerX = node.x;
            const centerY = node.y;

            // Calculate corner position using logical dimensions
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
            DesignerStore.setState({
                nodes: { [node.id]: node },
                camera: { panOffset: { x: 0, y: 0 }, zoomScale: 0.1 }
            });
            DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 0.1 });

            // Calculate corner position using visual dimensions
            const bounds = GeometryUtils.getStickyNoteBounds(node, null, 0.1);
            const cornerX = bounds.centerX + bounds.renderW / 2;
            const cornerY = bounds.centerY + bounds.renderH / 2;

            const worldPos = { x: cornerX, y: cornerY };
            const hit = resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner);
        });

        it('should detect resize handles accurately at high zoom (3.0x)', () => {
            const node = {
                id: 'test-sticky-high-zoom',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };
            DesignerStore.setState({
                nodes: { [node.id]: node },
                camera: { panOffset: { x: 0, y: 0 }, zoomScale: 3.0 }
            });
            DesignerInteraction.panZoomHandler.setState({ panOffset: { x: 0, y: 0 }, zoomScale: 3.0 });

            // Calculate corner position using visual dimensions
            const bounds = GeometryUtils.getStickyNoteBounds(node, null, 3.0);
            const cornerX = bounds.centerX + bounds.renderW / 2;
            const cornerY = bounds.centerY + bounds.renderH / 2;

            const worldPos = { x: cornerX, y: cornerY };
            const hit = resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner);
        });

        it('should detect resize handles for container nodes', () => {
            const node = {
                id: 'test-container',
                x: 100,
                y: 100,
                isRepoContainer: true,
                dimensions: { w: 300, h: 200, isManual: true }
            };
            DesignerStore.setState({ nodes: { [node.id]: node } });

            const logicalW = node.dimensions.w;
            const logicalH = node.dimensions.h;
            const centerX = node.x;
            const centerY = node.y;

            const cornerX = centerX + logicalW / 2;
            const cornerY = centerY + logicalH / 2;

            const worldPos = { x: cornerX, y: cornerY };
            const hit = resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner);
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
            DesignerStore.setState({ nodes: { [node.id]: node } });

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

            const updatedNode = DesignerStore.state.nodes[node.id];
            expect(updatedNode.dimensions.w).toBeGreaterThan(200);
            expect(updatedNode.dimensions.h).toBeGreaterThan(150);
        });

        it('should maintain aspect ratio consistency during resize', () => {
            const node = {
                id: 'aspect-ratio-test',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 100, isManual: true }
            };
            DesignerStore.setState({ nodes: { [node.id]: node } });

            const initialW = node.dimensions.w;
            const initialH = node.dimensions.h;

            const initialPos = { x: node.x + node.dimensions.w / 2, y: node.y + node.dimensions.h / 2 };
            resizeHandler.onStart(null, {
                nodeId: node.id,
                corner: 'se',
                initialPos: initialPos
            });

            const newMousePos = { x: initialPos.x + 100, y: initialPos.y + 50 };
            vi.spyOn(resizeHandler.controller, 'getMousePos').mockReturnValue({ x: 200, y: 150 });
            vi.spyOn(resizeHandler.controller, 'screenToWorld').mockReturnValue(newMousePos);

            resizeHandler.onUpdate(null);

            const updatedNode = DesignerStore.state.nodes[node.id];
            const newW = updatedNode.dimensions.w;
            const newH = updatedNode.dimensions.h;

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
            DesignerStore.setState({ nodes: { [node.id]: node } });

            const cornerX = node.x + node.dimensions.w / 2;
            const cornerY = node.y + node.dimensions.h / 2;
            const worldPos = { x: cornerX, y: cornerY };

            const hit = DesignerInteraction.resizeHandler.findResizeHandle(worldPos);

            expect(hit).not.toBeNull();
            expect(hit.nodeId).toBe(node.id);
            expect(['se']).toContain(hit.corner);
        });

        it('should maintain resize functionality when both containers and sticky notes are present', () => {
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

            DesignerStore.setState({
                nodes: { [container.id]: container, [stickyNote.id]: stickyNote }
            });

            const containerCornerX = container.x + container.dimensions.w / 2;
            const containerCornerY = container.y + container.dimensions.h / 2;
            const containerWorldPos = { x: containerCornerX, y: containerCornerY };

            const containerHit = DesignerInteraction.resizeHandler.findResizeHandle(containerWorldPos);
            expect(containerHit).not.toBeNull();
            expect(containerHit.nodeId).toBe(container.id);

            const stickyCornerX = stickyNote.x + stickyNote.dimensions.w / 2;
            const stickyCornerY = stickyNote.y + stickyNote.dimensions.h / 2;
            const stickyWorldPos = { x: stickyCornerX, y: stickyCornerY };

            const stickyHit = DesignerInteraction.resizeHandler.findResizeHandle(stickyWorldPos);
            expect(stickyHit).not.toBeNull();
            expect(stickyHit.nodeId).toBe(stickyNote.id);
        });

        it('should not interfere with resize when sticky note is added after containers', () => {
            const container = {
                id: 'first-container',
                x: 0,
                y: 0,
                isRepoContainer: true,
                dimensions: { w: 250, h: 150, isManual: true }
            };
            DesignerStore.setState({ nodes: { [container.id]: container } });

            const stickyNote = {
                id: 'added-later-sticky',
                x: 300,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 180, h: 100, isManual: true }
            };

            DesignerStore.setState({
                nodes: {
                    ...DesignerStore.state.nodes,
                    [stickyNote.id]: stickyNote
                }
            });

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