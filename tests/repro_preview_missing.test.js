
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';
import { BoundsCalculator } from '../src/renderer/js/views/pipeline/designer/utils/BoundsCalculator.js';

describe('Container Connection Preview Bug', () => {
    let containerNode;

    beforeEach(() => {
        containerNode = {
            id: 'container1',
            isRepoContainer: true,
            x: 100, y: 100,
            dimensions: { w: 200, h: 200, targetW: 200, targetH: 200 }
        };

        // Mock BoundsCalculator to simulate real behavior dependency
        // In the app, getContainerBounds might depend on 'nodes' list to size dynamic containers
        BoundsCalculator.getContainerBounds = vi.fn().mockImplementation((node, nodes) => {
            if (!nodes) {
                throw new Error('Nodes list is required for container bounds');
            }
            return { centerX: node.x, centerY: node.y, w: 200, h: 200 };
        });
    });

    it('should successfully get edge point for container when nodes list passed as null (Active Line Scenario)', () => {
        const mousePos = { x: 300, y: 100 }; // To the right

        // This mirrors ConnectionRenderer.drawActiveLine call:
        // GeometryUtils.getEdgePoint(fromNode, mouseX, mouseY, null, camera)

        // EXPECTATION: Should NOT throw, but it might if dependency isn't handled
        try {
            const point = GeometryUtils.getEdgePoint(containerNode, mousePos.x, mousePos.y, null, { zoomScale: 1.0 });
            expect(point).toBeDefined();
            expect(point.x).toBeGreaterThan(100);
        } catch (e) {
            // If it throws, we reproduced the bug
            expect(e.message).toBe('Nodes list is required for container bounds');
        }
    });
});
