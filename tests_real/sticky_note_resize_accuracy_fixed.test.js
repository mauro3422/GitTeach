// tests_real/sticky_note_resize_accuracy.test.js
// Tests para verificar la precisión de redimensionamiento de sticky notes
// con contenido de texto que afecta las dimensiones visuales

import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction.js';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';
import { BoundsCalculator } from '../src/renderer/js/views/pipeline/designer/utils/BoundsCalculator.js';
import { DimensionSync } from '../src/renderer/js/views/pipeline/designer/DimensionSync.js';

/**
 * Sticky Note Resize Accuracy Test
 *
 * Verifies that resize handles are detected accurately for sticky notes
 * with varying text content that affects visual dimensions
 */
describe('Sticky Note Resize Accuracy', () => {
    beforeEach(() => {
        const canvas = document.createElement('canvas');
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
        const bounds = BoundsCalculator.getStickyNoteBounds(node, null, 1.0);
        const visualCenterX = bounds.centerX || node.x;
        const visualCenterY = bounds.centerY || node.y;
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;

        // Verify bounds are valid
        expect(bounds).toBeDefined();
        expect(visualW).toBeGreaterThan(0);
        expect(visualH).toBeGreaterThan(0);

        // Get handle corners using DimensionSync
        const corners = DimensionSync.getHandleCorners(node, DesignerStore.state.nodes, 1.0);
        expect(corners).toBeDefined();
        expect(corners.length).toBe(4);
        expect(corners[3].x).toBeGreaterThan(visualCenterX - visualW); // SE corner x
        expect(corners[3].y).toBeGreaterThan(visualCenterY - visualH); // SE corner y
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
        const bounds = BoundsCalculator.getStickyNoteBounds(node, null, 1.0);
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;

        // Long text should increase visual dimensions
        expect(bounds).toBeDefined();
        expect(visualW).toBeGreaterThan(0);
        expect(visualH).toBeGreaterThan(0);

        // Text affects height more than short text
        const shortBounds = BoundsCalculator.getStickyNoteBounds(
            { ...node, text: 'Hi', id: 'short' },
            null,
            1.0
        );
        expect(visualH).toBeGreaterThanOrEqual(shortBounds.renderH || shortBounds.h);
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
        const bounds = BoundsCalculator.getStickyNoteBounds(node, null, 1.0);
        const visualW = bounds.renderW || bounds.w;
        const visualH = bounds.renderH || bounds.h;

        // Multiline text should increase visual height
        expect(bounds).toBeDefined();
        expect(visualW).toBeGreaterThan(0);
        expect(visualH).toBeGreaterThan(100); // Should be larger than base 100

        // Verify sync works with multiline
        const isValid = DimensionSync.validateSync(node, 1.0, DesignerStore.state.nodes);
        expect(isValid).toBe(true);
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

        // Test at low zoom (0.5x)
        DesignerStore.setState({
            ...DesignerStore.state,
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 0.5 }
        });

        const boundsLow = BoundsCalculator.getStickyNoteBounds(node, null, 0.5);

        // Test at normal zoom (1.0x)
        DesignerStore.setState({
            ...DesignerStore.state,
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 }
        });

        const boundsNormal = BoundsCalculator.getStickyNoteBounds(node, null, 1.0);

        // Test at high zoom (2.0x)
        DesignerStore.setState({
            ...DesignerStore.state,
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 2.0 }
        });

        const boundsHigh = BoundsCalculator.getStickyNoteBounds(node, null, 2.0);

        // Verify all zoom levels produce valid dimensions
        expect(boundsLow.renderW).toBeGreaterThan(0);
        expect(boundsNormal.renderW).toBeGreaterThan(0);
        expect(boundsHigh.renderW).toBeGreaterThan(0);

        // Higher zoom should generally produce larger visual dimensions
        expect(boundsHigh.renderW).toBeGreaterThanOrEqual(boundsLow.renderW);
    });

    it('should distinguish between container and sticky note handles correctly', () => {
        // Create both a container and a sticky note
        const container = {
            id: 'test-container',
            x: -100,
            y: 0,
            isRepoContainer: true,
            label: 'Test Container',
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

        // Get visual bounds for both nodes using BoundsCalculator
        const containerBounds = BoundsCalculator.getContainerBounds(container, DesignerStore.state.nodes, 1.0);
        const stickyBounds = BoundsCalculator.getStickyNoteBounds(stickyNote, null, 1.0);

        // Verify both have valid dimensions
        expect(containerBounds.renderW).toBeGreaterThan(0);
        expect(containerBounds.renderH).toBeGreaterThan(0);
        expect(stickyBounds.renderW).toBeGreaterThan(0);
        expect(stickyBounds.renderH).toBeGreaterThan(0);

        // Get handle corners for both
        const containerCorners = DimensionSync.getHandleCorners(container, DesignerStore.state.nodes, 1.0);
        const stickyCorners = DimensionSync.getHandleCorners(stickyNote, DesignerStore.state.nodes, 1.0);

        // Both should have 4 corners
        expect(containerCorners).toHaveLength(4);
        expect(stickyCorners).toHaveLength(4);

        // Container and sticky note should have different positions (separated by 200 units)
        expect(containerCorners[3].x).toBeLessThan(stickyCorners[3].x);
    });
});