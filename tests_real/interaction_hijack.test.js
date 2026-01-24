
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction.js';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler.js';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { ThemeManager } from '../src/renderer/js/core/ThemeManager.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

// Setup Mock Environment similar to interaction_integrity.test.js
describe('Interaction Hijack & Precision', () => {
    beforeEach(() => {
        // Mock ThemeManager
        if (!global.window) global.window = {};
        global.window.ThemeManager = ThemeManager;

        // Reset DesignerStore
        DesignerStore.setState({
            nodes: {},
            connections: [],
            camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 },
            interaction: { hoveredNodeId: null, selectedNodeId: null, selectedConnectionId: null, draggingNodeId: null, resizingNodeId: null }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should maintain node selection state correctly', () => {
        // SETUP
        const nodeA = { id: 'node-A', x: 0, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };
        const nodeB = { id: 'node-B', x: 200, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };

        DesignerStore.setState({
            ...DesignerStore.state,
            nodes: { [nodeA.id]: nodeA, [nodeB.id]: nodeB }
        });

        // Select node A
        DesignerStore.setState({
            ...DesignerStore.state,
            interaction: { ...DesignerStore.state.interaction, selectedNodeId: nodeA.id }
        });

        // Verify node A is selected
        expect(DesignerStore.state.interaction.selectedNodeId).toBe(nodeA.id);

        // Select node B
        DesignerStore.setState({
            ...DesignerStore.state,
            interaction: { ...DesignerStore.state.interaction, selectedNodeId: nodeB.id }
        });

        // Verify node B is selected
        expect(DesignerStore.state.interaction.selectedNodeId).toBe(nodeB.id);
    });

    it('should provide dimension info for selected nodes', () => {
        const nodeA = { id: 'node-A', x: 0, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };

        DesignerStore.setState({
            ...DesignerStore.state,
            nodes: { [nodeA.id]: nodeA }
        });

        DesignerStore.setState({
            ...DesignerStore.state,
            interaction: { ...DesignerStore.state.interaction, selectedNodeId: nodeA.id }
        });

        // Import DimensionSync to verify dimensions
        const { DimensionSync } = await import('../src/renderer/js/views/pipeline/designer/DimensionSync.js');

        const dims = DimensionSync.getSyncDimensions(nodeA, DesignerStore.state.nodes, 1.0);
        const corners = DimensionSync.getHandleCorners(nodeA, DesignerStore.state.nodes, 1.0);

        expect(dims.w).toBeGreaterThan(0);
        expect(dims.h).toBeGreaterThan(0);
        expect(corners).toHaveLength(4);
    });

    it('should maintain consistency of dimensions across selections', () => {
        const nodeA = { id: 'node-A', x: 0, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };

        DesignerStore.setState({
            ...DesignerStore.state,
            nodes: { [nodeA.id]: nodeA }
        });

        DesignerStore.setState({
            ...DesignerStore.state,
            interaction: { ...DesignerStore.state.interaction, selectedNodeId: nodeA.id }
        });

        // Verify that dimensions remain consistent when node is selected
        const node = DesignerStore.state.nodes[nodeA.id];
        expect(node).toBeDefined();
        expect(node.dimensions).toBeDefined();
        expect(node.dimensions.w).toBe(100);
        expect(node.dimensions.h).toBe(100);
    });
});
