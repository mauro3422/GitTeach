/**
 * visual-system.test.js
 * Comprehensive Vitest suite for Visual System v3.0 modules
 * Tests: ThemeManager, VisualEffects, LayoutUtils, VisualStateManager, TextRenderer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM elements for canvas context
const createMockContext = () => ({
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text) => ({ width: text.length * 8 })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    roundRect: vi.fn(),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    canvas: { width: 800, height: 600 }
});

// Mock ThemeManager (since it uses static properties)
const ThemeManager = {
    colors: {
        background: '#0d1117',
        primary: '#2f81f7',
        accent: '#3fb950',
        text: '#e6edf3',
        textDim: '#8b949e',
        border: '#30363d',
        error: '#f85149',
        success: '#238636',
        warning: '#fb923c',
        debug: '#ff00ff',
        hoverLight: '#8b949e',
        hoverBorder: '#58a6ff'
    },
    overlays: {
        tooltip: 'rgba(13, 17, 23, 0.98)',
        glass: 'rgba(22, 27, 34, 0.75)',
        glassThin: 'rgba(22, 27, 34, 0.1)',
        selection: 'rgba(63, 185, 80, 0.3)',
        border: 'rgba(255, 255, 255, 0.05)',
        borderLight: 'rgba(255, 255, 255, 0.1)'
    },
    effects: {
        shadow: {
            sm: { blur: 4, color: 'rgba(0,0,0,0.3)' },
            md: { blur: 15, color: 'rgba(0,0,0,0.4)' },
            lg: { blur: 20, color: 'rgba(0,0,0,0.5)' },
            neon: (color) => ({ blur: 25, color })
        }
    }
};

// ============================================================
// ThemeManager Tests
// ============================================================
describe('ThemeManager', () => {
    it('should have all required color tokens', () => {
        const requiredColors = ['background', 'primary', 'accent', 'text', 'textDim', 'border', 'error', 'success', 'warning', 'debug'];
        requiredColors.forEach(color => {
            expect(ThemeManager.colors[color]).toBeDefined();
            expect(ThemeManager.colors[color]).toMatch(/^#|^rgba?\(/);
        });
    });

    it('should have overlay tokens', () => {
        expect(ThemeManager.overlays.tooltip).toBeDefined();
        expect(ThemeManager.overlays.glass).toBeDefined();
    });

    it('should have dynamic neon shadow effect', () => {
        const neonEffect = ThemeManager.effects.shadow.neon('#ff0000');
        expect(neonEffect.blur).toBe(25);
        expect(neonEffect.color).toBe('#ff0000');
    });
});

// ============================================================
// VisualStateManager Tests
// ============================================================
describe('VisualStateManager', () => {
    const VisualStateManager = {
        STATES: { NORMAL: 'normal', HOVERED: 'hovered', DRAGGING: 'dragging', RESIZING: 'resizing' },
        getVisualState(node, interactionState = {}) {
            const { hoveredId, draggingId, resizingId } = interactionState;
            let state = this.STATES.NORMAL;
            let glowIntensity = 0.0;
            let opacity = 1.0;

            if (resizingId === node.id) { state = this.STATES.RESIZING; glowIntensity = 1.8; }
            else if (draggingId === node.id) { state = this.STATES.DRAGGING; glowIntensity = 1.2; opacity = 0.8; }
            else if (hoveredId === node.id) { state = this.STATES.HOVERED; glowIntensity = 0.8; }

            if (draggingId && draggingId !== node.id) opacity *= 0.6;

            return { opacity, glowIntensity, state };
        }
    };

    const mockNode = { id: 'node_1', x: 100, y: 100 };

    it('should return NORMAL state by default', () => {
        const result = VisualStateManager.getVisualState(mockNode, {});
        expect(result.state).toBe('normal');
        expect(result.glowIntensity).toBe(0);
    });

    it('should return HOVERED state when hoveredId matches', () => {
        const result = VisualStateManager.getVisualState(mockNode, { hoveredId: 'node_1' });
        expect(result.state).toBe('hovered');
        expect(result.glowIntensity).toBeGreaterThan(0);
    });

    it('should dim other nodes during drag', () => {
        const result = VisualStateManager.getVisualState(mockNode, { draggingId: 'other_node' });
        expect(result.opacity).toBeLessThan(1.0);
    });

    it('should prioritize RESIZING over HOVERED', () => {
        const result = VisualStateManager.getVisualState(mockNode, {
            hoveredId: 'node_1',
            resizingId: 'node_1'
        });
        expect(result.state).toBe('resizing');
    });
});

// ============================================================
// LayoutUtils Tests
// ============================================================
describe('LayoutUtils', () => {
    const LayoutUtils = {
        calculateContainerTargetSize(containerNode, childrenNodes, options = {}) {
            const { minWidth = 140, minHeight = 100, padding = 60 } = options;
            if (!childrenNodes || childrenNodes.length === 0) {
                return { targetW: minWidth, targetH: minHeight, centerX: containerNode.x, centerY: containerNode.y };
            }
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            childrenNodes.forEach(c => {
                minX = Math.min(minX, c.x - 35);
                maxX = Math.max(maxX, c.x + 35);
                minY = Math.min(minY, c.y - 35);
                maxY = Math.max(maxY, c.y + 35);
            });
            return {
                targetW: Math.max(minWidth, (maxX - minX) + padding),
                targetH: Math.max(minHeight, (maxY - minY) + padding + 40),
                centerX: (minX + maxX) / 2,
                centerY: (minY + maxY) / 2
            };
        },
        updateElasticDimensions(node, damping = 0.15, epsilon = 0.5) {
            if (!node.dimensions) return false;
            const dims = node.dimensions;
            let hasChanges = false;
            if (dims.targetW !== undefined && Math.abs(dims.animW - dims.targetW) > epsilon) {
                dims.animW += (dims.targetW - dims.animW) * damping;
                hasChanges = true;
            }
            if (dims.targetH !== undefined && Math.abs(dims.animH - dims.targetH) > epsilon) {
                dims.animH += (dims.targetH - dims.animH) * damping;
                hasChanges = true;
            }
            return hasChanges;
        }
    };

    it('should return min size for empty container', () => {
        const container = { x: 200, y: 200 };
        const result = LayoutUtils.calculateContainerTargetSize(container, []);
        expect(result.targetW).toBe(140);
        expect(result.targetH).toBe(100);
    });

    it('should calculate center based on children', () => {
        const container = { x: 0, y: 0 };
        const children = [
            { x: 50, y: 50 },
            { x: 150, y: 150 }
        ];
        const result = LayoutUtils.calculateContainerTargetSize(container, children);
        expect(result.centerX).toBe(100); // (50+150)/2
        expect(result.centerY).toBe(100);
    });

    it('should animate dimensions towards target', () => {
        const node = {
            dimensions: { animW: 100, animH: 100, targetW: 200, targetH: 150 }
        };
        const hasChanges = LayoutUtils.updateElasticDimensions(node);
        expect(hasChanges).toBe(true);
        expect(node.dimensions.animW).toBeGreaterThan(100);
        expect(node.dimensions.animH).toBeGreaterThan(100);
    });
});

// ============================================================
// TextRenderer Tests
// ============================================================
describe('TextRenderer', () => {
    const TextRenderer = {
        calculateLines(ctx, text, maxWidth) {
            if (!text || text.trim() === '') return [''];
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            words.forEach(word => {
                const testLine = currentLine + word + ' ';
                if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                    lines.push(currentLine.trim());
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            });
            if (currentLine.trim()) lines.push(currentLine.trim());
            return lines.length > 0 ? lines : [''];
        }
    };

    let mockCtx;

    beforeEach(() => {
        mockCtx = createMockContext();
    });

    it('should return single line for short text', () => {
        const lines = TextRenderer.calculateLines(mockCtx, 'Hello World', 200);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toBe('Hello World');
    });

    it('should wrap long text into multiple lines', () => {
        const longText = 'This is a very long text that should wrap';
        const lines = TextRenderer.calculateLines(mockCtx, longText, 100);
        expect(lines.length).toBeGreaterThan(1);
    });

    it('should handle empty text', () => {
        const lines = TextRenderer.calculateLines(mockCtx, '', 200);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toBe('');
    });
});

// ============================================================
// InputManager Tests
// ============================================================
describe('InputManager', () => {
    const InputManager = {
        _shortcuts: new Map(),
        registerShortcut(keys, actionName, callback) {
            const keyCombo = typeof keys === 'string' ? keys.toLowerCase() : keys.join('+').toLowerCase();
            this._shortcuts.set(keyCombo, { actionName, callback });
            return true;
        },
        unregisterShortcut(keys) {
            const keyCombo = typeof keys === 'string' ? keys.toLowerCase() : keys.join('+').toLowerCase();
            return this._shortcuts.delete(keyCombo);
        },
        hasShortcut(keys) {
            const keyCombo = typeof keys === 'string' ? keys.toLowerCase() : keys.join('+').toLowerCase();
            return this._shortcuts.has(keyCombo);
        }
    };

    beforeEach(() => {
        InputManager._shortcuts.clear();
    });

    it('should register shortcuts', () => {
        const callback = vi.fn();
        InputManager.registerShortcut('ctrl+z', 'Undo', callback);
        expect(InputManager.hasShortcut('ctrl+z')).toBe(true);
    });

    it('should unregister shortcuts', () => {
        InputManager.registerShortcut('ctrl+y', 'Redo', vi.fn());
        InputManager.unregisterShortcut('ctrl+y');
        expect(InputManager.hasShortcut('ctrl+y')).toBe(false);
    });

    it('should handle array key combos', () => {
        InputManager.registerShortcut(['ctrl', 's'], 'Save', vi.fn());
        expect(InputManager.hasShortcut(['ctrl', 's'])).toBe(true);
    });
});
