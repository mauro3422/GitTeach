import { describe, it, expect } from 'vitest';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

/**
 * Verify Split-Scaling Success
 * Ensures text maintains a minimum legibility floor.
 */
describe('Split-Scaling Verification', () => {
    const baseFontSize = 24;
    const zooms = [1.0, 0.5, 0.3, 0.2, 0.1];

    it('should maintain legibility across all zoom levels', () => {
        console.log('\n=== SPLIT-SCALING VERIFICATION ===');
        console.log(`Base Font Size: ${baseFontSize}px`);
        console.log('------------------------------------------------------------');
        console.log('| Zoom | BodyScale | FontScale | Screen Font | Status |');
        console.log('|------|-----------|-----------|-------------|--------|');

        zooms.forEach(zoom => {
            const bScale = GeometryUtils.getVisualScale(zoom);
            const fScale = GeometryUtils.getFontScale(zoom);
            const screenFontSize = baseFontSize * fScale * zoom;

            const status = screenFontSize >= 11 ? '✅ OK' : '⚠️ LOW';

            console.log(`| ${zoom.toFixed(1).padEnd(4)} | ${bScale.toFixed(2).padEnd(9)} | ${fScale.toFixed(2).padEnd(9)} | ${screenFontSize.toFixed(1).padEnd(11)} | ${status} |`);

            // Critical floor: 10px screen size
            expect(screenFontSize).toBeGreaterThan(10);
        });
        console.log('------------------------------------------------------------\n');
    });
});
