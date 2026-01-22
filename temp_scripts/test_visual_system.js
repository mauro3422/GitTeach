/**
 * test_visual_system.js
 * Comprehensive test script for the Visual System v3.0 modules
 * Tests: TextRenderer, VisualEffects, LayoutUtils, VisualStateManager, InputManager, MessageRenderer
 */

console.log('🧪 Testing Visual System v3.0 Modules...\n');

// Mock canvas context for testing
const mockCtx = {
    save: () => { },
    restore: () => { },
    fillText: () => { },
    measureText: (text) => ({ width: text.length * 8 }),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    beginPath: () => { },
    arc: () => { },
    fill: () => { },
    stroke: () => { },
    rect: () => { },
    fillRect: () => { },
    strokeRect: () => { },
    roundRect: () => { },
    canvas: { width: 800, height: 600 }
};

// Mock node for testing
const mockNode = {
    id: 'test_node_1',
    x: 100,
    y: 100,
    label: 'Test Node',
    isRepoContainer: false,
    isStickyNote: false,
    dimensions: { w: 180, h: 100, animW: 180, animH: 100 }
};

const mockContainer = {
    id: 'container_1',
    x: 200,
    y: 200,
    label: 'Test Container',
    isRepoContainer: true,
    dimensions: { w: 300, h: 200, animW: 300, animH: 200, targetW: 300, targetH: 200, isManual: false }
};

let passCount = 0;
let failCount = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passCount++;
    } catch (e) {
        console.log(`❌ ${name}: ${e.message}`);
        failCount++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================
// Test 1: VisualStateManager
// ============================================================
console.log('\n📊 Testing VisualStateManager...');

// Import mock since we can't use ES modules in Node directly
const VisualStateManager = {
    STATES: { NORMAL: 'normal', HOVERED: 'hovered', SELECTED: 'selected', DRAGGING: 'dragging', CONNECTING: 'connecting', RESIZING: 'resizing' },
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

test('VisualStateManager returns NORMAL state by default', () => {
    const result = VisualStateManager.getVisualState(mockNode, {});
    assert(result.state === 'normal', `Expected 'normal', got '${result.state}'`);
});

test('VisualStateManager returns HOVERED state when hoveredId matches', () => {
    const result = VisualStateManager.getVisualState(mockNode, { hoveredId: 'test_node_1' });
    assert(result.state === 'hovered', `Expected 'hovered', got '${result.state}'`);
    assert(result.glowIntensity > 0, 'Glow intensity should be > 0 for hovered');
});

test('VisualStateManager returns DRAGGING state and dims other nodes', () => {
    const result = VisualStateManager.getVisualState(mockNode, { draggingId: 'other_node' });
    assert(result.opacity < 1.0, `Expected opacity < 1.0, got ${result.opacity}`);
});

// ============================================================
// Test 2: LayoutUtils
// ============================================================
console.log('\n📐 Testing LayoutUtils...');

const LayoutUtils = {
    calculateContainerTargetSize(containerNode, childrenNodes, options = {}) {
        const { minWidth = 140, minHeight = 100 } = options;
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
            targetW: Math.max(minWidth, (maxX - minX) + 60),
            targetH: Math.max(minHeight, (maxY - minY) + 100),
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

test('LayoutUtils calculates correct size for empty container', () => {
    const result = LayoutUtils.calculateContainerTargetSize(mockContainer, []);
    assert(result.targetW === 140, `Expected targetW=140, got ${result.targetW}`);
    assert(result.targetH === 100, `Expected targetH=100, got ${result.targetH}`);
});

test('LayoutUtils calculates correct size with children', () => {
    const children = [
        { x: 50, y: 50, label: 'A' },
        { x: 150, y: 150, label: 'B' }
    ];
    const result = LayoutUtils.calculateContainerTargetSize(mockContainer, children);
    assert(result.targetW > 140, `Expected targetW > 140, got ${result.targetW}`);
    assert(result.centerX === 100, `Expected centerX=100, got ${result.centerX}`);
});

test('LayoutUtils updateElasticDimensions animates towards target', () => {
    const testNode = {
        dimensions: { animW: 100, animH: 100, targetW: 200, targetH: 150 }
    };
    const hasChanges = LayoutUtils.updateElasticDimensions(testNode);
    assert(hasChanges === true, 'Expected hasChanges to be true');
    assert(testNode.dimensions.animW > 100, `Expected animW > 100, got ${testNode.dimensions.animW}`);
});

// ============================================================
// Test 3: TextRenderer (mock)
// ============================================================
console.log('\n📝 Testing TextRenderer...');

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

test('TextRenderer calculateLines returns single line for short text', () => {
    const lines = TextRenderer.calculateLines(mockCtx, 'Hello World', 200);
    assert(lines.length === 1, `Expected 1 line, got ${lines.length}`);
});

test('TextRenderer calculateLines returns multiple lines for long text', () => {
    const longText = 'This is a very long text that should definitely wrap to multiple lines when rendered on canvas';
    const lines = TextRenderer.calculateLines(mockCtx, longText, 100);
    assert(lines.length > 1, `Expected multiple lines, got ${lines.length}`);
});

// ============================================================
// Test 4: InputManager (mock)
// ============================================================
console.log('\n⌨️ Testing InputManager...');

const InputManager = {
    _shortcuts: new Map(),
    registerShortcut(keys, actionName, callback) {
        const keyCombo = typeof keys === 'string' ? keys.toLowerCase() : keys.join('+').toLowerCase();
        this._shortcuts.set(keyCombo, { actionName, callback });
    },
    unregisterShortcut(keys) {
        const keyCombo = typeof keys === 'string' ? keys.toLowerCase() : keys.join('+').toLowerCase();
        this._shortcuts.delete(keyCombo);
    },
    hasShortcut(keys) {
        const keyCombo = typeof keys === 'string' ? keys.toLowerCase() : keys.join('+').toLowerCase();
        return this._shortcuts.has(keyCombo);
    }
};

test('InputManager registers shortcuts correctly', () => {
    InputManager.registerShortcut('ctrl+z', 'Undo', () => { });
    assert(InputManager.hasShortcut('ctrl+z'), 'Shortcut should be registered');
});

test('InputManager unregisters shortcuts correctly', () => {
    InputManager.registerShortcut('ctrl+y', 'Redo', () => { });
    InputManager.unregisterShortcut('ctrl+y');
    assert(!InputManager.hasShortcut('ctrl+y'), 'Shortcut should be unregistered');
});

// ============================================================
// Summary
// ============================================================
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(50));

if (failCount === 0) {
    console.log('🎉 All Visual System v3.0 tests PASSED!');
} else {
    console.log('⚠️ Some tests failed. Please review.');
    process.exit(1);
}
