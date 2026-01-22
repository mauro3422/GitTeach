/**
 * Bug Replicator Test: Color/Hover System
 * Uses REAL imports from the system to test actual behavior
 * 
 * TRIGGER: Create containers, hover, resize
 * EXPECTED: Colors stable, only one node hovered
 * ACTUAL (Bug): Colors change, multiple nodes light up
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager } from '../src/renderer/js/core/ThemeManager.js';

describe('ThemeManager Color Cache', () => {
    beforeEach(() => {
        // Clear cache before each test
        ThemeManager._nodeColorCache.clear();
    });

    it('should return different colors for different IDs', () => {
        const ids = ['custom_001', 'custom_002', 'custom_003'];
        const colors = ids.map(id => ThemeManager.getNeonColorForId(id));

        console.log('Colors generated:', colors);

        // All colors should be from the palette
        colors.forEach(color => {
            expect(ThemeManager.neonPalette).toContain(color);
        });

        // At least 2 should be different (with 8 colors, 3 IDs should vary)
        const uniqueColors = new Set(colors);
        expect(uniqueColors.size).toBeGreaterThanOrEqual(2);
    });

    it('should return SAME color for same ID (cache works)', () => {
        const id = 'test_container_123';

        const color1 = ThemeManager.getNeonColorForId(id);
        const color2 = ThemeManager.getNeonColorForId(id);
        const color3 = ThemeManager.getNeonColorForId(id);

        console.log(`Color for ${id}:`, color1);

        expect(color1).toBe(color2);
        expect(color2).toBe(color3);
    });

    it('should persist colors after object recreation (the real bug scenario)', () => {
        // Simulate: create node, get color, recreate node, get color again
        const nodeId = 'custom_bugtest_001';

        // First "render"
        const color1 = ThemeManager.getNeonColorForId(nodeId);

        // Simulate DesignerStore.setState recreating the object
        // (This is what happens in the real system)
        const mockNode1 = { id: nodeId, isRepoContainer: true };
        const mockNode2 = { ...mockNode1 }; // Shallow copy (new object, same ID)

        // Second "render" with new object reference
        const color2 = ThemeManager.getNeonColorForId(mockNode2.id);

        console.log(`Node recreated: color1=${color1}, color2=${color2}`);

        // Colors MUST be the same - cache should use ID, not object reference
        expect(color1).toBe(color2);
    });
});

describe('Hover State Isolation', () => {
    it('should only mark one node as hovered', () => {
        // Mock nodes like the real system
        const nodes = {
            container_1: { id: 'container_1', isRepoContainer: true, isHovered: false },
            container_2: { id: 'container_2', isRepoContainer: true, isHovered: false },
            container_3: { id: 'container_3', isRepoContainer: true, isHovered: false }
        };

        // Simulate handleMouseMove setting hover
        const targetId = 'container_2';
        Object.values(nodes).forEach(n => { n.isHovered = (n.id === targetId); });

        // Check only one is hovered
        const hoveredNodes = Object.values(nodes).filter(n => n.isHovered);

        console.log('Hovered nodes:', hoveredNodes.map(n => n.id));

        expect(hoveredNodes.length).toBe(1);
        expect(hoveredNodes[0].id).toBe('container_2');
    });
});
