/**
 * integration-real.test.js
 * Integration tests using REAL module imports (no mocks)
 * Tests the actual implementation of core modules
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import REAL modules
import { CoordinateUtils } from '../src/renderer/js/views/pipeline/designer/CoordinateUtils.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';
import { HistoryManager } from '../src/renderer/js/views/pipeline/designer/modules/HistoryManager.js';
import { ThemeManager } from '../src/renderer/js/core/ThemeManager.js';

// ============================================================
// CoordinateUtils (REAL)
// ============================================================
describe('CoordinateUtils (REAL)', () => {
    it('should convert screen to world coordinates', () => {
        const navState = { panOffset: { x: 100, y: 50 }, zoomScale: 2.0 };
        const screenPos = { x: 400, y: 300 };

        const worldPos = CoordinateUtils.screenToWorld(screenPos, navState);

        expect(worldPos.x).toBe(150); // (400 - 100) / 2
        expect(worldPos.y).toBe(125); // (300 - 50) / 2
    });

    it('should convert world to screen coordinates', () => {
        const navState = { panOffset: { x: 100, y: 50 }, zoomScale: 2.0 };
        const worldPos = { x: 150, y: 125 };

        const screenPos = CoordinateUtils.worldToScreen(worldPos, navState);

        expect(screenPos.x).toBe(400);
        expect(screenPos.y).toBe(300);
    });

    it('should maintain identity on round-trip conversion', () => {
        const navState = { panOffset: { x: 123, y: 456 }, zoomScale: 1.75 };
        const originalWorld = { x: 200, y: 300 };

        const screen = CoordinateUtils.worldToScreen(originalWorld, navState);
        const backToWorld = CoordinateUtils.screenToWorld(screen, navState);

        expect(backToWorld.x).toBeCloseTo(originalWorld.x, 5);
        expect(backToWorld.y).toBeCloseTo(originalWorld.y, 5);
    });
});

// ============================================================
// GeometryUtils (REAL)
// ============================================================
describe('GeometryUtils (REAL)', () => {
    it('should calculate node radius correctly', () => {
        const regularNode = { id: 'n1', x: 100, y: 100 };
        const satelliteNode = { id: 'n2', x: 100, y: 100, isSatellite: true };

        const radius1 = GeometryUtils.getNodeRadius(regularNode, 1.0);
        const radius2 = GeometryUtils.getNodeRadius(satelliteNode, 1.0);

        expect(radius1).toBeGreaterThan(radius2); // Regular nodes are bigger
    });

    it('should detect point in node correctly', () => {
        const node = { id: 'n1', x: 100, y: 100 };

        const inside = GeometryUtils.isPointInNode({ x: 100, y: 100 }, node, 1.0);
        const outside = GeometryUtils.isPointInNode({ x: 200, y: 200 }, node, 1.0);

        expect(inside).toBe(true);
        expect(outside).toBe(false);
    });

    it('should calculate distance between points (getDistance)', () => {
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 3, y: 4 };

        const d = GeometryUtils.getDistance(p1, p2);

        expect(d).toBe(5); // 3-4-5 triangle
    });

    it('should detect point in rectangle (center-based)', () => {
        // rect uses center-based format: x,y is center, w,h is size
        const rect = { x: 100, y: 100, w: 50, h: 50 }; // Center at (100,100)

        const inside = GeometryUtils.isPointInRectangle({ x: 100, y: 100 }, rect); // Center
        const outside = GeometryUtils.isPointInRectangle({ x: 200, y: 200 }, rect);

        expect(inside).toBe(true);
        expect(outside).toBe(false);
    });
});

// ============================================================
// HistoryManager (REAL)
// ============================================================
describe('HistoryManager (REAL)', () => {
    beforeEach(() => {
        HistoryManager.clear();
    });

    it('should have ACTION_TYPES defined', () => {
        expect(HistoryManager.ACTION_TYPES).toBeDefined();
        expect(HistoryManager.ACTION_TYPES.NODE_MOVE).toBe('node:move');
        expect(HistoryManager.ACTION_TYPES.NODE_CREATE).toBe('node:create');
    });

    it('should save state to history with action type', () => {
        const nodes = { 'n1': { id: 'n1', x: 100, y: 100 } };
        const connections = [];

        HistoryManager.saveToHistory(nodes, connections, HistoryManager.ACTION_TYPES.NODE_CREATE, { nodeId: 'n1' });

        expect(HistoryManager.canUndo()).toBe(true);
    });

    it('should restore previous state on undo', () => {
        const initialNodes = { 'n1': { id: 'n1', x: 100, y: 100 } };
        HistoryManager.saveToHistory(initialNodes, []);

        const modifiedNodes = { 'n1': { id: 'n1', x: 200, y: 200 } };

        const restored = HistoryManager.undo(modifiedNodes, []);

        expect(restored).not.toBeNull();
        expect(restored.nodes['n1'].x).toBe(100);
    });

    it('should redo after undo', () => {
        HistoryManager.saveToHistory({ 'n1': { x: 100 } }, []);
        HistoryManager.undo({ 'n1': { x: 200 } }, []);

        expect(HistoryManager.canRedo()).toBe(true);

        const redone = HistoryManager.redo({ 'n1': { x: 100 } }, []);

        expect(redone).not.toBeNull();
    });

    it('should respect setRecording flag', () => {
        HistoryManager.setRecording(false);
        HistoryManager.saveToHistory({ 'n1': { x: 100 } }, []);

        expect(HistoryManager.canUndo()).toBe(false);

        HistoryManager.setRecording(true);
    });
});

// ============================================================
// ThemeManager (REAL)
// ============================================================
describe('ThemeManager (REAL)', () => {
    it('should have all required color tokens', () => {
        const colors = ThemeManager.colors;

        expect(colors.background).toBeDefined();
        expect(colors.primary).toBeDefined();
        expect(colors.error).toBeDefined();
        expect(colors.success).toBeDefined();
        expect(colors.warning).toBeDefined();
        expect(colors.debug).toBeDefined();
    });

    it('should have overlays defined', () => {
        const overlays = ThemeManager.overlays;

        expect(overlays.tooltip).toBeDefined();
        expect(overlays.glass).toBeDefined();
    });

    it('should have neon palette', () => {
        expect(ThemeManager.neonPalette).toBeDefined();
        expect(ThemeManager.neonPalette.length).toBeGreaterThan(0);
    });

    it('should generate consistent color for same nodeId', () => {
        // Mock window object if needed
        if (typeof window === 'undefined') {
            global.window = { __GITEACH_COLOR_CACHE__: new Map() };
        }

        const color1 = ThemeManager.getNeonColorForId('test_node');
        const color2 = ThemeManager.getNeonColorForId('test_node');

        expect(color1).toBe(color2);
    });

    it('should have dynamic neon shadow effect', () => {
        const neonEffect = ThemeManager.effects.shadow.neon('#ff0000');

        expect(neonEffect.blur).toBe(25);
        expect(neonEffect.color).toBe('#ff0000');
    });
});
