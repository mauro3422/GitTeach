
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesignerStore } from '../src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

describe('Container Hit Testing', () => {
    let originalState;

    beforeEach(() => {
        // Mock State
        if (!DesignerStore.state) DesignerStore.state = { nodes: {}, interaction: {} };
        originalState = JSON.parse(JSON.stringify(DesignerStore.state));
        DesignerStore.state.nodes = {};
    });

    afterEach(() => {
        DesignerStore.state.nodes = originalState.nodes;
        vi.restoreAllMocks();
    });

    it('should hit container using VISUAL/RENDERED bounds (renderW), not just logical (w)', () => {
        // Scenario: A container is logically small (10x10) but visually inflated (100x100)
        // This happens at low zoom (0.1x) where 100 logical units becomes 10px on screen, 
        // but strict legibility contract might inflate it back to ~100 logical units equivalent?
        // Actually, let's just assume renderW is different from w.

        const container = {
            id: 'cont-1',
            x: 0,
            y: 0,
            dimensions: { w: 100, h: 100, animW: 200, animH: 200 }, // visually 2x larger
            isRepoContainer: true
        };
        DesignerStore.state.nodes = { [container.id]: container };

        // Mock GeometryUtils to return different Render vs Logical bounds
        // Fallback in GeometryUtils already supports animW.
        // renderW = animW * scale. Let's assume scale 1.

        // Logical Hit Box: -50 to +50
        // Visual Hit Box: -100 to +100 (since animW=200, centered)

        // TEST: Click at x=80 (Inside Visual, Outside Logical)
        const hit = DesignerStore.findNodeAt({ x: 80, y: 0 }, null, 1.0);

        // EXPECTATION: Should hit because user sees the Visual Box
        expect(hit).not.toBeNull();
        expect(hit.id).toBe('cont-1');
    });

    it('should hit container via isPointInContainer logic consistency', () => {
        const container = {
            id: 'cont-2',
            x: 1000,
            y: 1000,
            dimensions: { w: 100, h: 100 },
            isRepoContainer: true
        };
        DesignerStore.state.nodes = { [container.id]: container };

        const hit = DesignerStore.findNodeAt({ x: 1000, y: 1000 }, null, 1.0);
        expect(hit).not.toBeNull();
        expect(hit.id).toBe('cont-2');
    });
});
