
import { describe, it, expect, beforeEach } from 'vitest';
import { HitTester } from '../src/renderer/js/views/pipeline/designer/modules/services/HitTester.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

// Mock dependencies
global.DESIGNER_CONSTANTS = {
    INTERACTION: { HIT_BUFFER: 5 },
    DIMENSIONS: { CONTAINER: { DEFAULT_W: 100, DEFAULT_H: 100 } }
};

describe('Container Masking Bug', () => {
    let nodes;

    beforeEach(() => {
        nodes = {};
        // Mock GeometryUtils
        GeometryUtils.getContainerBounds = (node) => ({
            centerX: node.x,
            centerY: node.y,
            w: 200, h: 200,
            renderW: 200, renderH: 200
        });
        GeometryUtils.getNodeRadius = () => 20;
        GeometryUtils.getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    });

    it('should prioritize regular nodes inside a container regardless of creation order', () => {
        // Scenario 1: Node created BEFORE Container (The Bug Scenario)
        // User has existing nodes, then wraps them in a new box
        nodes = {
            'oldable_node': {
                id: 'old_node',
                x: 100, y: 100,
                isRepoContainer: false,
                parentId: 'new_container' // Logically inside
            },
            'new_container': {
                id: 'new_container',
                x: 100, y: 100,
                isRepoContainer: true
            }
        };

        // Order in object is property order, usually insertion order
        // Check finding node at (100, 100)
        const hit = HitTester.findNodeAt({ x: 100, y: 100 }, nodes);

        // BUG EXPECTATION: If bug exists, it hits the container because it's last in the list
        // DESIRED BEHAVIOR: Should hit the node
        expect(hit.id).toBe('old_node');
    });

    it('should prioritize regular nodes when created AFTER container', () => {
        // Scenario 2: Node created AFTER Container (Works currently)
        nodes = {
            'old_container': {
                id: 'old_container',
                x: 100, y: 100,
                isRepoContainer: true
            },
            'new_node': {
                id: 'new_node',
                x: 100, y: 100,
                isRepoContainer: false,
                parentId: 'old_container'
            }
        };

        const hit = HitTester.findNodeAt({ x: 100, y: 100 }, nodes);
        expect(hit.id).toBe('new_node');
    });
});
