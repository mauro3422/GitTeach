import { describe, it, expect } from 'vitest';

/**
 * 🧪 REPLICATION SCRIPT: Coordinate Drift Simulation
 * Goal: Verify how Save/Load cycles affect Sticky Note coordinates.
 */

describe('Coordinate Serialization Drift', () => {
    const scale = 1200;

    // User reported world coordinates around 2240
    let worldX = 2240;
    let worldY = -870;

    it('should maintain EXACT coordinates through a save/load cycle', () => {
        // SAVE: BlueprintManager.generateBlueprint logic
        const savedX = worldX / scale;
        const savedY = worldY / scale;

        console.log('=== SAVE PHASE ===');
        console.log(`  - Original World: [${worldX}, ${worldY}]`);
        console.log(`  - Normalized Save: [${savedX.toFixed(4)}, ${savedY.toFixed(4)}]`);

        // LOAD: RoutingDesignerStateLoader.hydrateNode logic
        const loadedX = savedX * scale;
        const loadedY = savedY * scale;

        console.log('=== LOAD PHASE ===');
        console.log(`  - Re-scaled World: [${loadedX}, ${loadedY}]`);

        expect(loadedX).toBeCloseTo(worldX);
        expect(loadedY).toBeCloseTo(worldY);
    });

    it('should detect if coordinates are accidentally being double-scaled', () => {
        // HYPOTHESIS: If someone calls loadAndHydrate on data that WASN'T divided by 1200...
        const accidentalAbsoluteX = 2240;
        const doubleScaledX = accidentalAbsoluteX * scale;

        console.log('=== DOUBLE-SCALE FAILURE TEST ===');
        console.log(`  - Input (supposedly normalized): ${accidentalAbsoluteX}`);
        console.log(`  - Multiplied by scale: ${doubleScaledX}`);

        if (doubleScaledX > 10000) {
            console.log('✗ ALERT: Extreme coordinate detected! HTML editor will likely miss the viewport.');
        }

        expect(doubleScaledX).toBeGreaterThan(100000); // This confirms why it's far away
    });
});
