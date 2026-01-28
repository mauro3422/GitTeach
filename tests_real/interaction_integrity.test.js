import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils';
import { InlineEditor } from '../src/renderer/js/views/pipeline/designer/interaction/InlineEditor';

/**
 * Interaction Integrity Test
 * 
 * Verifies that resizing and overlay positioning remain synchronized
 * even at extreme zoom levels with visual inflation.
 */
describe('Interaction & Overlay Integrity', () => {
    let canvas;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.id = 'designer-canvas';
        canvas.width = 1920;
        canvas.height = 1080;
        document.body.appendChild(canvas);

        const container = document.createElement('div');
        container.id = 'designer-container';
        document.body.appendChild(container);

        DesignerStore.setState({ nodes: {}, connections: [] });
        DesignerInteraction.init(canvas, () => DesignerStore.state.nodes, () => { });
    });

    describe('Resizing Accuracy', () => {
        it('should maintain 1:1 mouse tracking during resize at extreme zoom (0.1x)', () => {
            // 1. Setup a node at extreme zoom
            const node = {
                id: 'test-node',
                x: 0,
                y: 0,
                isStickyNote: true,
                dimensions: { w: 200, h: 150, isManual: true }
            };
            DesignerStore.setState({
                nodes: { [node.id]: node },
                camera: { panOffset: { x: 0, y: 0 }, zoomScale: 0.1 }
            });

            const zoom = 0.1;
            const bounds = GeometryUtils.getStickyNoteBounds(node, null, zoom);

            // Log for debugging visibility
            console.log(`[Test] Logical W: ${node.dimensions.w}, Render W (Inflated): ${bounds.renderW}`);

            // 2. Simulate MouseDown on Bottom-Right corner
            // The handle is drawn at node.x + renderW/2
            const startWorldX = node.x + bounds.renderW / 2;
            const startWorldY = node.y + bounds.renderH / 2;

            DesignerInteraction.resizeHandler.start({}, {
                nodeId: node.id,
                corner: 'se',
                initialPos: { x: startWorldX, y: startWorldY }
            });

            // 3. Move mouse by 100 screen pixels (which is 1000 world units at 0.1x zoom)
            const screenDelta = 100;
            const worldDelta = screenDelta / zoom; // 1000

            const targetWorldX = startWorldX + worldDelta;
            const targetWorldY = startWorldY + worldDelta;

            // Mocking event object
            const moveEvent = {
                clientX: (targetWorldX * zoom), // simplified screen conversion
                clientY: (targetWorldY * zoom)
            };

            // We bypass the raw event and set the mouse pos directly in world space for the handler
            // or we use update() with a mocked event and ensure worldPos calculation is correct.
            vi.spyOn(DesignerInteraction, 'getMousePos').mockReturnValue({ x: 100, y: 100 });
            vi.spyOn(DesignerInteraction, 'screenToWorld').mockReturnValue({ x: startWorldX + worldDelta, y: startWorldY + worldDelta });

            // Ejecutar update() múltiples veces para detectar bucles de retroalimentación
            const iterations = 10;
            // First update handles the initial jump
            DesignerInteraction.resizeHandler.update({});

            let prevW = DesignerStore.state.nodes[node.id].dimensions.w;
            let growthRate = 0;

            // Subsequent updates should be perfectly stable (0 growth)
            for (let i = 0; i < iterations; i++) {
                DesignerInteraction.resizeHandler.update({});

                const currentW = DesignerStore.state.nodes[node.id].dimensions.w;
                growthRate = (currentW - prevW) / Math.max(1, prevW);

                // Stability check: should not grow further if mouse is stationary
                expect(Math.abs(growthRate)).toBeLessThan(0.0001);

                prevW = currentW;
            }

            // 4. VERIFICATION:
            // Since we moved the mouse by 1000 units in world space,
            // and the box is INFLATED, the logical width change should be
            // exactly that worldDelta divided by the visual scale.

            // Expected logical width = original + (worldDelta / actualScale)
            // If scale is correct, moving the mouse to the visual corner should stay glued.
            const updatedNode = DesignerStore.state.nodes[node.id];
            const newW = updatedNode.dimensions.w;

            console.log(`[Test] New Logical Width: ${newW}`);

            // If it "Jumped", newW will be huge.
            // A perfect sync means: node.x + (newW * scale / 2) == targetWorldX
            const finalBounds = GeometryUtils.getStickyNoteBounds(updatedNode, null, zoom);
            const visualCornerX = updatedNode.x + finalBounds.renderW / 2;

            expect(visualCornerX).toBeCloseTo(targetWorldX, 1);
        });

        it('should scale children proportionally during container resize', () => {
            const container = {
                id: 'container-1',
                isRepoContainer: true,
                x: 0,
                y: 0,
                dimensions: { w: 500, h: 500, isManual: true }
            };
            const child = {
                id: 'child-1',
                parentId: 'container-1',
                x: 100,
                y: 100,
                dimensions: { w: 100, h: 100 }
            };

            DesignerStore.setState({
                nodes: { [container.id]: container, [child.id]: child },
                camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 }
            });
            DesignerStore.selectNode(container.id); // Must select to resize!

            // Start resizing container SE corner
            DesignerInteraction.resizeHandler.onStart(null, {
                nodeId: container.id,
                corner: 'se',
                initialPos: { x: 250, y: 250 }
            });

            // Move mouse out to double the size
            vi.spyOn(DesignerInteraction, 'getMousePos').mockReturnValue({ x: 500, y: 500 });
            vi.spyOn(DesignerInteraction, 'screenToWorld').mockReturnValue({ x: 500, y: 500 });

            DesignerInteraction.resizeHandler.update({});

            const updatedContainer = DesignerStore.state.nodes[container.id];
            const updatedChild = DesignerStore.state.nodes[child.id];

            // Container size should have grown
            expect(updatedContainer.dimensions.w).toBeGreaterThan(500);

            // Child position should have shifted proportionally
            expect(updatedChild.x).toBeGreaterThan(100);
        });
    });

    describe('Inline Editor Alignment', () => {
        it('should align HTML editor exactly with canvas rendered bounds at 0.1x zoom', () => {
            const node = {
                id: 'sticky-1',
                x: 500,
                y: 500,
                isStickyNote: true,
                text: 'Hello World',
                dimensions: { w: 200, h: 100, isManual: true }
            };
            const zoom = 0.1;
            const navState = { panOffset: { x: 0, y: 0 }, zoomScale: zoom };
            DesignerStore.setState({
                nodes: { [node.id]: node },
                camera: navState
            });

            InlineEditor.open(node, () => { });
            InlineEditor.syncPosition(navState, (pos) => DesignerInteraction.worldToScreen(pos));

            const textarea = document.getElementById('inline-note-editor');
            const bounds = GeometryUtils.getStickyNoteBounds(node, null, zoom);

            // Screen Width of the box on canvas
            const expectedScreenWidth = bounds.renderW * zoom;

            expect(parseFloat(textarea.style.width)).toBeCloseTo(expectedScreenWidth, 1);

            // Font size check: Should be inflated
            const fScale = GeometryUtils.getFontScale(zoom, 18);
            const expectedFontSize = 18 * fScale * zoom;

            expect(parseFloat(textarea.style.fontSize)).toBeCloseTo(expectedFontSize, 1);
        });
    });
});
