import { describe, it, expect } from 'vitest';

/**
 * 🧪 REPLICATION SCRIPT: Visual Alignment & Overlay Drift
 * Goal: Prove that HTML overlays drift if the container origin doesn't match the Canvas.
 */

describe('HTML Overlay Alignment', () => {
    const navState = {
        zoomScale: 1.5,
        panOffset: { x: 500, y: 200 } // Typical pan
    };

    const node = { x: 2240, y: -870, dimensions: { w: 180, h: 100 } };

    it('should calculate screen position for HTML overlay', () => {
        const zoom = navState.zoomScale;
        const pan = navState.panOffset;

        // Math from ModalManager.syncNoteEditorPosition
        const screenX = node.x * zoom + pan.x;
        const screenY = node.y * zoom + pan.y;

        console.log('=== OVERLAY MATH ===');
        console.log(`  - Node World: [${node.x}, ${node.y}]`);
        console.log(`  - Screen Result: [${screenX}, ${screenY}]`);

        // Scenario: If screenY is -1105, and the container is only 800px high...
        // The text will be invisibly high up.
        // BUT the user sees it at the BOTTOM?
        // This confirms that 'pan.y' or 'node.y' in the user's session is likely a large POSITIVE value.
    });

    it('should detect origin displacement', () => {
        // If the container has a 300px header above it...
        const containerOffsetTop = 300;
        const worldY = 100; // Middle of screen

        // Canvas draws at: 100 * zoom + pan
        // HTML is placed at: 100 * zoom + pan

        // If the HTML coordinates are RELATIVE to the container, 
        // they MUST NOT include the pan/zoom if those were meant for absolute screen space.
        // But our pan/zoom ARE the world transformation.

        console.log('=== DISPLACEMENT ALERT ===');
        console.log('If the Canvas uses local translate() but HTML uses absolute top/left,');
        console.log('they will ONLY align if the parent container is exactly the same size as the canvas.');
    });
});
