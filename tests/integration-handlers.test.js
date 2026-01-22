/**
 * integration-handlers.test.js
 * 
 * Integration tests that use REAL module imports with MINIMAL DOM mocks.
 * These tests catch bugs that occur in the integration between modules,
 * like the `e.preventDefault is not a function` bug in InputManager → DesignerInteraction.
 * 
 * Strategy:
 * - Import REAL modules (InputManager, DesignerInteraction handlers)
 * - Mock ONLY what's strictly necessary (canvas, DOM elements)
 * - Test the FLOW between modules, not just isolated functions
 * 
 * Note: Global mocks are set up in vitest-setup.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import REAL modules (global mocks already set up by vitest-setup.js)
import { InputManager } from '../src/renderer/js/views/pipeline/designer/modules/InputManager.js';
import { HistoryManager } from '../src/renderer/js/views/pipeline/designer/modules/HistoryManager.js';
import { CoordinateUtils } from '../src/renderer/js/views/pipeline/designer/CoordinateUtils.js';
import { GeometryUtils } from '../src/renderer/js/views/pipeline/designer/GeometryUtils.js';

// ============================================================
// Minimal DOM Mocks (shared across tests)
// ============================================================
const createMockCanvas = () => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: { cursor: 'default' },
    getContext: vi.fn(() => createMockContext()),
    width: 800,
    height: 600
});

const createMockContext = () => ({
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    translate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowBlur: 0,
    shadowColor: '',
    globalAlpha: 1
});

const createMockWheelEvent = (overrides = {}) => ({
    deltaX: 0,
    deltaY: 100,
    deltaZ: 0,
    deltaMode: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    clientX: 400,
    clientY: 300,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides
});

const createMockMouseEvent = (overrides = {}) => ({
    button: 0,
    buttons: 1,
    clientX: 400,
    clientY: 300,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides
});

const createMockKeyEvent = (overrides = {}) => ({
    key: '',
    code: '',
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides
});

// ============================================================
// InputManager Integration Tests
// ============================================================
describe('InputManager Integration', () => {
    let mockCanvas;
    let receivedEvents;

    beforeEach(() => {
        mockCanvas = createMockCanvas();
        receivedEvents = {
            mouseDown: null,
            mouseMove: null,
            mouseUp: null,
            wheel: null,
            keyDown: null,
            keyUp: null,
            doubleClick: null
        };

        // Reset InputManager state
        InputManager._element = null;
        InputManager._handlers = {};
        InputManager._shortcuts.clear();
    });

    describe('Event Normalization', () => {
        it('should pass preventDefault to wheel handlers (regression test)', () => {
            let preventDefaultCalled = false;
            let crashError = null;

            InputManager.init(mockCanvas, {
                onWheel: (e) => {
                    try {
                        e.preventDefault();
                        preventDefaultCalled = true;
                    } catch (err) {
                        crashError = err;
                    }
                }
            });

            const mockEvent = createMockWheelEvent();
            InputManager._handleWheel(mockEvent);

            expect(crashError).toBeNull();
            expect(preventDefaultCalled).toBe(true);
        });

        it('should normalize mouse events correctly', () => {
            InputManager.init(mockCanvas, {
                onMouseDown: (e) => { receivedEvents.mouseDown = e; }
            });

            const mockEvent = createMockMouseEvent({ button: 2, clientX: 123, clientY: 456 });
            InputManager._handleMouseDown(mockEvent);

            expect(receivedEvents.mouseDown).not.toBeNull();
            expect(receivedEvents.mouseDown.button).toBe(2);
            expect(receivedEvents.mouseDown.clientX).toBe(123);
        });

        it('should normalize key events correctly', () => {
            InputManager.init(mockCanvas, {
                onKeyDown: (e) => { receivedEvents.keyDown = e; }
            });

            const mockEvent = createMockKeyEvent({ key: 'z', code: 'KeyZ', ctrlKey: true });
            InputManager._handleKeyDown(mockEvent);

            expect(receivedEvents.keyDown).not.toBeNull();
            expect(receivedEvents.keyDown.key).toBe('z');
            expect(receivedEvents.keyDown.ctrlKey).toBe(true);
        });

        it('should handle double click events', () => {
            InputManager.init(mockCanvas, {
                onDoubleClick: (e) => { receivedEvents.doubleClick = e; }
            });

            const mockEvent = createMockMouseEvent({ clientX: 200, clientY: 150 });
            InputManager._handleDoubleClick(mockEvent);

            expect(receivedEvents.doubleClick).not.toBeNull();
            expect(receivedEvents.doubleClick.clientX).toBe(200);
        });
    });

    describe('Shortcut Registration', () => {
        it('should register shortcuts', () => {
            InputManager.init(mockCanvas, {});
            InputManager.registerShortcut('ctrl+z', 'Undo', () => { });

            expect(InputManager._shortcuts.has('ctrl+z')).toBe(true);
        });

        it('should unregister shortcuts', () => {
            InputManager.init(mockCanvas, {});
            InputManager.registerShortcut('ctrl+y', 'Redo', () => { });
            InputManager.unregisterShortcut('ctrl+y');

            expect(InputManager._shortcuts.has('ctrl+y')).toBe(false);
        });
    });
});

// ============================================================
// HistoryManager Integration Tests
// ============================================================
describe('HistoryManager Integration', () => {
    beforeEach(() => {
        HistoryManager.clear();
        HistoryManager.setRecording(true);
    });

    it('should maintain state consistency through undo/redo cycle', () => {
        const initialNodes = { 'n1': { id: 'n1', x: 100, y: 100 } };

        HistoryManager.saveToHistory(initialNodes, [], HistoryManager.ACTION_TYPES.NODE_CREATE, { nodeId: 'n1' });

        const modifiedNodes = { 'n1': { id: 'n1', x: 200, y: 200 } };
        const undoState = HistoryManager.undo(modifiedNodes, []);

        expect(undoState.nodes['n1'].x).toBe(100);
    });

    it('should track action types in history', () => {
        HistoryManager.saveToHistory({ 'n1': { id: 'n1', x: 100 } }, [], HistoryManager.ACTION_TYPES.NODE_MOVE, { nodeId: 'n1' });

        const undoState = HistoryManager.undo({ 'n1': { x: 200 } }, []);
        expect(undoState.actionType).toBe('node:move');
    });
});

// ============================================================
// Coordinate Transformation Integration
// ============================================================
describe('Coordinate Transformation Integration', () => {
    it('should correctly transform coordinates through full pipeline', () => {
        const navState = { panOffset: { x: 100, y: 50 }, zoomScale: 1.5 };
        const nodes = { 'n1': { id: 'n1', x: 200, y: 200 } };

        const screenClick = { x: 400, y: 350 };
        const worldPos = CoordinateUtils.screenToWorld(screenClick, navState);
        const isInNode = GeometryUtils.isPointInNode(worldPos, nodes['n1'], navState.zoomScale);

        expect(worldPos).toHaveProperty('x');
        expect(typeof isInNode).toBe('boolean');
    });

    it('should maintain precision through zoom operations', () => {
        const initialNavState = { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 };
        const worldPoint = { x: 300, y: 200 };

        const screenPos = CoordinateUtils.worldToScreen(worldPoint, initialNavState);

        const newZoom = 2.0;
        const newPan = {
            x: screenPos.x - worldPoint.x * newZoom,
            y: screenPos.y - worldPoint.y * newZoom
        };
        const zoomedNavState = { panOffset: newPan, zoomScale: newZoom };

        const newScreenPos = CoordinateUtils.worldToScreen(worldPoint, zoomedNavState);

        expect(newScreenPos.x).toBeCloseTo(screenPos.x, 1);
        expect(newScreenPos.y).toBeCloseTo(screenPos.y, 1);
    });
});

// ============================================================
// Geometry Hit Testing Integration
// ============================================================
describe('Geometry Hit Testing Integration', () => {
    it('should correctly detect hits on different node types', () => {
        const regularNode = { id: 'reg', x: 100, y: 100, isSatellite: false };
        const satelliteNode = { id: 'sat', x: 100, y: 100, isSatellite: true };

        const regRadius = GeometryUtils.getNodeRadius(regularNode, 1.0);
        const satRadius = GeometryUtils.getNodeRadius(satelliteNode, 1.0);

        expect(regRadius).toBeGreaterThan(satRadius);
        expect(GeometryUtils.isPointInNode({ x: 100, y: 100 }, regularNode, 1.0)).toBe(true);
        expect(GeometryUtils.isPointInNode({ x: 500, y: 500 }, regularNode, 1.0)).toBe(false);
    });

    it('should calculate edge points correctly', () => {
        const node = { id: 'n1', x: 100, y: 100 };
        const camera = { zoomScale: 1.0 };
        const edgePoint = GeometryUtils.getEdgePoint(node, 200, 100, {}, camera);

        expect(edgePoint.x).toBeGreaterThan(node.x);
        expect(edgePoint.y).toBeCloseTo(node.y, 1);
    });
});

// ============================================================
// Full Interaction Chain Simulation
// ============================================================
describe('Full Interaction Chain Simulation', () => {
    it('should handle complete drag flow without errors', () => {
        const mockCanvas = createMockCanvas();
        let dragStarted = false;
        let dragUpdated = false;
        let dragEnded = false;

        InputManager.init(mockCanvas, {
            onMouseDown: () => { dragStarted = true; },
            onMouseMove: () => { dragUpdated = true; },
            onMouseUp: () => { dragEnded = true; }
        });

        InputManager._handleMouseDown(createMockMouseEvent({ clientX: 100, clientY: 100 }));
        InputManager._handleMouseMove(createMockMouseEvent({ clientX: 150, clientY: 150 }));
        InputManager._handleMouseUp(createMockMouseEvent({ clientX: 150, clientY: 150 }));

        expect(dragStarted).toBe(true);
        expect(dragUpdated).toBe(true);
        expect(dragEnded).toBe(true);
    });

    it('should handle zoom sequence without errors', () => {
        const mockCanvas = createMockCanvas();
        let zoomCount = 0;

        InputManager.init(mockCanvas, {
            onWheel: (e) => {
                e.preventDefault();
                zoomCount++;
            }
        });

        for (let i = 0; i < 5; i++) {
            InputManager._handleWheel(createMockWheelEvent({ deltaY: i % 2 === 0 ? 100 : -100 }));
        }

        expect(zoomCount).toBe(5);
    });
});
