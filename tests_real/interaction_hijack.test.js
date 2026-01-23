
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesignerInteraction } from '../src/renderer/js/views/pipeline/designer/DesignerInteraction.js';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler.js';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { ThemeManager } from '../src/renderer/js/core/ThemeManager.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

// Setup Mock Environment similar to interaction_integrity.test.js
describe('Interaction Hijack & Precision', () => {
    let originalState;

    beforeEach(() => {
        // Mock ThemeManager
        if (!global.window) global.window = {};
        global.window.ThemeManager = ThemeManager;

        // Ensure state exists
        if (!DesignerStore.state) {
            DesignerStore.state = { nodes: {}, interaction: {} };
        }

        // Save Store State
        originalState = JSON.parse(JSON.stringify(DesignerStore.state));

        // Reset Controller Mocks
        DesignerInteraction.controller = {
            nodes: DesignerStore.state.nodes,
            store: DesignerStore,
            state: { zoomScale: 1.0 },
            getMousePos: vi.fn(),
            screenToWorld: vi.fn(pos => pos),
            worldToScreen: vi.fn(pos => pos),
            forceUpdate: vi.fn()
        };
        // Mock Store State locally for the test
        DesignerInteraction.controller = {
            nodes: {},
            store: {
                state: {
                    interaction: { selectedNodeId: null },
                    nodes: {}
                }
            },
            state: { zoomScale: 1.0 },
            getMousePos: vi.fn(),
            screenToWorld: vi.fn(pos => pos),
            worldToScreen: vi.fn(pos => pos),
            forceUpdate: vi.fn()
        };
        DesignerInteraction.resizeHandler = new ResizeHandler(DesignerInteraction.controller);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should NOT allow resizing an unselected node when clicking its handle area', () => {
        // SETUP
        const nodeA = { id: 'node-A', x: 0, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };
        const nodeB = { id: 'node-B', x: 200, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };

        const nodes = { [nodeA.id]: nodeA, [nodeB.id]: nodeB };
        DesignerInteraction.controller.nodes = nodes;
        DesignerInteraction.controller.store.state.interaction.selectedNodeId = nodeA.id;

        // ACTION: Click on Node B's SE corner
        const targetPos = { x: 250, y: 50 };
        const hit = DesignerInteraction.resizeHandler.findResizeHandle(targetPos);

        expect(hit).toBeNull();
    });

    it('should allow resizing ONLY the selected node', () => {
        const nodeA = { id: 'node-A', x: 0, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };
        const nodes = { [nodeA.id]: nodeA };

        DesignerInteraction.controller.nodes = nodes;
        DesignerInteraction.controller.store.state.interaction.selectedNodeId = nodeA.id;

        const targetPos = { x: 50, y: 50 }; // SE Corner
        const hit = DesignerInteraction.resizeHandler.findResizeHandle(targetPos);


        expect(hit).not.toBeNull();
        expect(hit.nodeId).toBe('node-A');
        expect(hit.corner).toBe('se');
    });

    it('should not detect handle if mouse is too far (Precision Check)', () => {
        const nodeA = { id: 'node-A', x: 0, y: 0, dimensions: { w: 100, h: 100 }, isStickyNote: true };
        const nodes = { [nodeA.id]: nodeA };

        DesignerInteraction.controller.nodes = nodes;
        DesignerInteraction.controller.store.state.interaction.selectedNodeId = nodeA.id;

        // SE Corner is at (50, 50).
        // Default threshold is usually around 10-30px.
        // Let's test a point 50px away.
        const targetPos = { x: 100, y: 100 };
        const hit = DesignerInteraction.resizeHandler.findResizeHandle(targetPos);

        expect(hit).toBeNull();
    });
});
