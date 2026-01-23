import { describe, it, expect } from 'vitest';
import { ResizeHandler } from '../src/renderer/js/views/pipeline/designer/interaction/ResizeHandler.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

describe('Systemic Resize Verification 2.0', () => {

    it('should detect handles at 0.1x zoom using compensated hit-threshold', () => {
        const zoom = 0.1;
        const mockController = {
            nodes: {
                'sticky_1': {
                    id: 'sticky_1',
                    isStickyNote: true,
                    text: '',
                    x: 0,
                    y: 0,
                    dimensions: { w: 200, h: 100 }
                }
            },
            camera: { zoomScale: zoom },
            getMousePos: (e) => e,
            screenToWorld: (p) => p
        };

        const handler = new ResizeHandler(mockController);

        const bScale = GeometryUtils.getVisualScale(zoom);
        const expectedWorldW = 200 * bScale;

        // Southeast corner
        const cornerPos = { x: expectedWorldW / 2, y: (100 * bScale) / 2 };

        // Test with a mouse click that is 'far' in world space but 'near' in screen space
        // At zoom 0.1, 10px on screen is 100px in world space.
        const mouseWorldPos = { x: cornerPos.x + 50, y: cornerPos.y + 50 };

        console.log(`\n--- V2 HANDLE TEST ---`);
        console.log(`Zoom: ${zoom} | Corner @ ${cornerPos.x.toFixed(1)}`);
        console.log(`Mouse @ ${mouseWorldPos.x.toFixed(1)} (Offset: 50 units)`);

        const result = handler.findResizeHandle(mouseWorldPos);
        expect(result).not.toBeNull();
        expect(result.corner).toBe('se');
    });

    it('should correctly calculate symmetrical logical growth', () => {
        const zoom = 0.5;
        const bScale = GeometryUtils.getVisualScale(zoom); // ~1.27
        const node = {
            id: 'sticky_1',
            isStickyNote: true,
            text: '',
            x: 0,
            y: 0,
            dimensions: { w: 200, h: 100 }
        };
        const mockController = {
            nodes: { 'sticky_1': node },
            camera: { zoomScale: zoom },
            getMousePos: (e) => e,
            screenToWorld: (p) => p
        };

        const handler = new ResizeHandler(mockController);

        // Start SE Corner
        const worldStart = { x: (200 * bScale) / 2, y: (100 * bScale) / 2 };
        handler.onStart(null, { nodeId: 'sticky_1', corner: 'se', initialPos: worldStart });

        // Drag 50 units out
        const movement = 50;
        const worldUpdate = { x: worldStart.x + movement, y: worldStart.y + movement };
        handler.onUpdate(worldUpdate);

        // SYMMETRICAL GROWTH: Width increases by 2 * logicalDelta
        const logicalDelta = movement / bScale;
        const expectedLogicalW = 200 + (logicalDelta * 2);

        console.log(`\n--- V2 PERSISTENCE TEST ---`);
        console.log(`Actual Logical Width: ${node.dimensions.w.toFixed(2)}`);
        console.log(`Expected: ${expectedLogicalW.toFixed(2)}`);

        expect(node.dimensions.w).toBeCloseTo(expectedLogicalW, 1);
    });
});
