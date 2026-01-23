// tests/dimensionsync_basic_test.test.js
// Test básico para verificar que DimensionSync funcione correctamente

import { describe, it, expect } from 'vitest';

// Importar directamente el módulo
import { DimensionSync } from '../src/renderer/js/views/pipeline/designer/DimensionSync.js';

describe('DimensionSync Basic Functionality Test', () => {
    it('should provide visual dimensions for sticky notes', () => {
        const node = {
            id: 'test-sticky',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Test text',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const dims = DimensionSync.getVisualDimensions(node, 1.0, {});

        expect(dims).toBeDefined();
        expect(dims.centerX).toBeCloseTo(node.x);
        expect(dims.centerY).toBeCloseTo(node.y);
        expect(dims.logicalW).toBeGreaterThan(0);
        expect(dims.logicalH).toBeGreaterThan(0);
        expect(dims.visualW).toBeGreaterThan(0);
        expect(dims.visualH).toBeGreaterThan(0);
    });

    it('should provide visual dimensions for containers', () => {
        const node = {
            id: 'test-container',
            x: 0,
            y: 0,
            isRepoContainer: true,
            dimensions: { w: 200, h: 150, isManual: true }
        };

        const dims = DimensionSync.getVisualDimensions(node, 1.0, { [node.id]: node });

        expect(dims).toBeDefined();
        expect(dims.centerX).toBeCloseTo(node.x);
        expect(dims.centerY).toBeCloseTo(node.y);
        expect(dims.logicalW).toBeGreaterThan(0);
        expect(dims.logicalH).toBeGreaterThan(0);
        expect(dims.visualW).toBeGreaterThan(0);
        expect(dims.visualH).toBeGreaterThan(0);
    });

    it('should calculate visual handle positions correctly', () => {
        const node = {
            id: 'handle-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Handle test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const handlePos = DimensionSync.getVisualHandlePosition(node, 'se', 1.0, {});

        expect(handlePos).toBeDefined();
        expect(typeof handlePos.x).toBe('number');
        expect(typeof handlePos.y).toBe('number');
    });

    it('should validate sync correctly', () => {
        const node = {
            id: 'sync-test',
            x: 0,
            y: 0,
            isStickyNote: true,
            text: 'Sync test',
            dimensions: { w: 180, h: 100, isManual: true }
        };

        const isValid = DimensionSync.validateSync(node, 1.0, {});

        expect(isValid).toBe(true);
    });
});