// tests/repro_extraction_bug.test.js
import { describe, it, expect } from 'vitest';
import { DimensionSync } from '../src/renderer/js/views/pipeline/designer/DimensionSync.js';
import { BoundsCalculator } from '../src/renderer/js/views/pipeline/designer/utils/BoundsCalculator.js';
import { DESIGNER_CONSTANTS } from '../src/renderer/js/views/pipeline/designer/DesignerConstants.js';

describe('Container Extraction Bug Reproduction', () => {
    it('should NOT expand container when a child node is being excluded (dragged out)', () => {
        // Setup a container and two children
        const container = {
            id: 'parent',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 100, h: 100, animW: 100, animH: 100, targetW: 100, targetH: 100, isManual: false }
        };

        const child1 = { id: 'child1', x: 0, y: 0, parentId: 'parent', label: 'C1' };
        const child2 = { id: 'child2', x: 0, y: 0, parentId: 'parent', label: 'C2' };

        const nodes = {
            [container.id]: container,
            [child1.id]: child1,
            [child2.id]: child2
        };

        // 1. Base case: Container with both children at (0,0)
        const baseBounds = BoundsCalculator.getContainerBounds(container, nodes, 1.0);
        const baseLogicalWidth = baseBounds.w;

        // 2. Move child2 far away (at 500,0) but simulate it's being "excluded" (draggingNodeId = 'child2')
        child2.x = 500;

        // This simulates WITHOUT the FIX (passing null or nothing for excludeNodeId)
        // We use a clone to avoid state contamination
        const containerWithBug = JSON.parse(JSON.stringify(container));
        const boundsWithBug = BoundsCalculator.getContainerBounds(containerWithBug, nodes, 1.0);

        console.log(`Base logical width: ${baseLogicalWidth}, Logical width with moved child (no exclusion): ${boundsWithBug.w}`);
        expect(boundsWithBug.w).toBeGreaterThan(baseLogicalWidth);

        // 3. Now simulate WITH the FIX (passing 'child2' as excludeNodeId)
        const containerFixed = JSON.parse(JSON.stringify(container));
        const boundsFixed = BoundsCalculator.getContainerBounds(containerFixed, nodes, 1.0, null, 'child2');

        console.log(`Logical width with child2 excluded: ${boundsFixed.w}`);
        // If fixed, boundsFixed.w should be equal to baseLogicalWidth
        expect(boundsFixed.w).toBe(baseLogicalWidth);
    });

    it('should verify that DimensionSync passes the draggingNodeId correctly after fix', () => {
        // This test will fail until DimensionSync is updated
        const container = {
            id: 'parent',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 100, h: 100, animW: 100, animH: 100, targetW: 100, targetH: 100, isManual: false }
        };

        const child1 = { id: 'child1', x: 0, y: 0, parentId: 'parent', label: 'C1' };
        const child2 = { id: 'child2', x: 500, y: 0, parentId: 'parent', label: 'C2' };

        const nodes = {
            [container.id]: container,
            [child1.id]: child1,
            [child2.id]: child2
        };

        // Call DimensionSync.getSyncDimensions with draggingNodeId
        // Before fix, this argument might be ignored or not even in signature
        const syncDims = DimensionSync.getSyncDimensions(container, nodes, 1.0, 'child2');

        // We know base width should be around 140-180 (MIN_W * vScale + padding)
        // If child2 (at 500) is NOT excluded, width will be ~1000+
        console.log(`Sync width with CHILD2 dragged: ${syncDims.w}`);

        // Threshold: 300px logical is enough to know if child2 (at 500) was excluded
        expect(syncDims.w).toBeLessThan(300);
    });
});
