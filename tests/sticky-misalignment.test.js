import { describe, it, expect } from 'vitest';
import { CanvasUtils } from '../src/renderer/js/views/pipeline/designer/CanvasUtils.js';

/**
 * 🧪 REPLICATION SCRIPT: Sticky Note Spatial Misalignment
 * Goal: Verify why World coordinates [2240, -870] result in a misaligned HTML editor.
 */

describe('Sticky Note Coordinate Transformation', () => {
    // NavState simulation based on the TRAP logs (Zoom looks high, Pan is unknown but we'll test defaults)
    const navState = {
        zoomScale: 1.5,
        panOffset: { x: 0, y: 0 }
    };

    const worldPos = { x: 2240, y: -870 };

    it('should calculate screen coordinates consistently with Canvas renderer', () => {
        const screenPos = CanvasUtils.worldToScreen(worldPos, navState);

        console.log('=== COORDINATE AUDIT ===');
        console.log(`  - World Position: [${worldPos.x}, ${worldPos.y}]`);
        console.log(`  - Nav State: Zoom=${navState.zoomScale}, Pan=[${navState.panOffset.x}, ${navState.panOffset.y}]`);
        console.log(`  - Resulting Screen Position: [${screenPos.x}, ${screenPos.y}]`);

        // If screenY is negative, it's OFF-SCREEN TOP (which explain why user doesn't see it correctly)
        // In the screenshot, the text appeared at the BOTTOM.
        // This suggests note.y is actually POSITIVE in the user's real project.

        expect(screenPos.x).toBe(worldPos.x * navState.zoomScale + navState.panOffset.x);
        expect(screenPos.y).toBe(worldPos.y * navState.zoomScale + navState.panOffset.y);
    });

    it('should handle large positive world coordinates correctly', () => {
        // Test with positive Y to see if it lands at the bottom
        const positiveWorld = { x: 2240, y: 870 };
        const screenPos = CanvasUtils.worldToScreen(positiveWorld, navState);

        console.log('=== POSITIVE Y TEST ===');
        console.log(`  - World Position: [${positiveWorld.x}, ${positiveWorld.y}]`);
        console.log(`  - Resulting Screen Position: [${screenPos.x}, ${screenPos.y}]`);

        expect(screenPos.y).toBeGreaterThan(0);
    });
});
