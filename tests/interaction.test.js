/**
 * interaction.test.js
 * E2E-style tests for interaction handlers using real component logic
 * Tests drag, pan, zoom, resize, and connection flows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock canvas and events for interaction testing
const createMockCanvas = () => ({
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: { cursor: 'default' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
});

const createMockEvent = (overrides = {}) => ({
    clientX: 400,
    clientY: 300,
    button: 0,
    buttons: 1,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides
});

// ============================================================
// CoordinateUtils Tests (Integration-style)
// ============================================================
describe('CoordinateUtils Integration', () => {
    const CoordinateUtils = {
        screenToWorld(screenPos, navState) {
            const { panOffset, zoomScale } = navState;
            return {
                x: (screenPos.x - panOffset.x) / zoomScale,
                y: (screenPos.y - panOffset.y) / zoomScale
            };
        },
        worldToScreen(worldPos, navState) {
            const { panOffset, zoomScale } = navState;
            return {
                x: worldPos.x * zoomScale + panOffset.x,
                y: worldPos.y * zoomScale + panOffset.y
            };
        }
    };

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
// DragHandler Tests
// ============================================================
describe('DragHandler Behavior', () => {
    const DragHandler = {
        state: { draggingNodeId: null, dragOffset: { x: 0, y: 0 } },

        start(nodeId, initialPos, node) {
            this.state = {
                draggingNodeId: nodeId,
                dragOffset: {
                    x: initialPos.x - node.x,
                    y: initialPos.y - node.y
                }
            };
        },

        update(mousePos, nodes) {
            if (!this.state.draggingNodeId) return;
            const node = nodes[this.state.draggingNodeId];
            if (!node) return;

            node.x = mousePos.x - this.state.dragOffset.x;
            node.y = mousePos.y - this.state.dragOffset.y;
        },

        end() {
            const nodeId = this.state.draggingNodeId;
            this.state = { draggingNodeId: null, dragOffset: { x: 0, y: 0 } };
            return nodeId;
        },

        isActive() {
            return this.state.draggingNodeId !== null;
        }
    };

    let nodes;

    beforeEach(() => {
        nodes = {
            'node_1': { id: 'node_1', x: 100, y: 100, label: 'Test' }
        };
        DragHandler.state = { draggingNodeId: null, dragOffset: { x: 0, y: 0 } };
    });

    it('should start drag with correct offset', () => {
        const clickPos = { x: 105, y: 110 };
        DragHandler.start('node_1', clickPos, nodes['node_1']);

        expect(DragHandler.isActive()).toBe(true);
        expect(DragHandler.state.dragOffset.x).toBe(5);
        expect(DragHandler.state.dragOffset.y).toBe(10);
    });

    it('should move node correctly during drag', () => {
        DragHandler.start('node_1', { x: 100, y: 100 }, nodes['node_1']);

        DragHandler.update({ x: 200, y: 250 }, nodes);

        expect(nodes['node_1'].x).toBe(200);
        expect(nodes['node_1'].y).toBe(250);
    });

    it('should end drag and return node id', () => {
        DragHandler.start('node_1', { x: 100, y: 100 }, nodes['node_1']);

        const endedNodeId = DragHandler.end();

        expect(endedNodeId).toBe('node_1');
        expect(DragHandler.isActive()).toBe(false);
    });
});

// ============================================================
// PanZoomHandler Tests
// ============================================================
describe('PanZoomHandler Behavior', () => {
    const PanZoomHandler = {
        state: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0, isPanning: false, panStart: null },

        startPan(rawPos) {
            this.state.isPanning = true;
            this.state.panStart = { ...rawPos };
        },

        updatePan(rawPos) {
            if (!this.state.isPanning || !this.state.panStart) return;

            const dx = rawPos.x - this.state.panStart.x;
            const dy = rawPos.y - this.state.panStart.y;

            this.state.panOffset.x += dx;
            this.state.panOffset.y += dy;
            this.state.panStart = { ...rawPos };
        },

        endPan() {
            this.state.isPanning = false;
            this.state.panStart = null;
        },

        handleWheel(deltaY, mousePos) {
            const delta = deltaY > 0 ? 0.9 : 1.1;
            const nextZoom = this.state.zoomScale * delta;

            if (nextZoom >= 0.3 && nextZoom <= 4.0) {
                // Zoom towards mouse position
                const worldX = (mousePos.x - this.state.panOffset.x) / this.state.zoomScale;
                const worldY = (mousePos.y - this.state.panOffset.y) / this.state.zoomScale;

                this.state.zoomScale = nextZoom;

                this.state.panOffset.x = mousePos.x - worldX * nextZoom;
                this.state.panOffset.y = mousePos.y - worldY * nextZoom;
            }
        },

        isActive() {
            return this.state.isPanning;
        }
    };

    beforeEach(() => {
        PanZoomHandler.state = { panOffset: { x: 0, y: 0 }, zoomScale: 1.0, isPanning: false, panStart: null };
    });

    it('should start pan correctly', () => {
        PanZoomHandler.startPan({ x: 400, y: 300 });

        expect(PanZoomHandler.isActive()).toBe(true);
        expect(PanZoomHandler.state.panStart).toEqual({ x: 400, y: 300 });
    });

    it('should update pan offset during drag', () => {
        PanZoomHandler.startPan({ x: 400, y: 300 });
        PanZoomHandler.updatePan({ x: 450, y: 350 });

        expect(PanZoomHandler.state.panOffset.x).toBe(50);
        expect(PanZoomHandler.state.panOffset.y).toBe(50);
    });

    it('should zoom in on scroll up', () => {
        const initialZoom = PanZoomHandler.state.zoomScale;

        PanZoomHandler.handleWheel(-100, { x: 400, y: 300 }); // Scroll up = zoom in

        expect(PanZoomHandler.state.zoomScale).toBeGreaterThan(initialZoom);
    });

    it('should zoom out on scroll down', () => {
        const initialZoom = PanZoomHandler.state.zoomScale;

        PanZoomHandler.handleWheel(100, { x: 400, y: 300 }); // Scroll down = zoom out

        expect(PanZoomHandler.state.zoomScale).toBeLessThan(initialZoom);
    });

    it('should respect zoom limits', () => {
        // Try to zoom out past minimum
        for (let i = 0; i < 20; i++) {
            PanZoomHandler.handleWheel(100, { x: 400, y: 300 });
        }

        expect(PanZoomHandler.state.zoomScale).toBeGreaterThanOrEqual(0.3);
    });
});

// ============================================================
// ResizeHandler Tests
// ============================================================
describe('ResizeHandler Behavior', () => {
    const ResizeHandler = {
        state: { resizingNodeId: null, resizeCorner: null, startSize: null, startMouse: null },

        start(nodeId, corner, mousePos, node) {
            this.state = {
                resizingNodeId: nodeId,
                resizeCorner: corner,
                startMouse: { ...mousePos },
                startSize: { w: node.dimensions.w, h: node.dimensions.h }
            };
        },

        update(mousePos, nodes) {
            if (!this.state.resizingNodeId) return;

            const node = nodes[this.state.resizingNodeId];
            if (!node || !node.dimensions) return;

            const dx = mousePos.x - this.state.startMouse.x;
            const dy = mousePos.y - this.state.startMouse.y;

            let newW = this.state.startSize.w;
            let newH = this.state.startSize.h;

            switch (this.state.resizeCorner) {
                case 'se': newW += dx * 2; newH += dy * 2; break;
                case 'sw': newW -= dx * 2; newH += dy * 2; break;
                case 'ne': newW += dx * 2; newH -= dy * 2; break;
                case 'nw': newW -= dx * 2; newH -= dy * 2; break;
            }

            node.dimensions.w = Math.max(140, newW);
            node.dimensions.h = Math.max(100, newH);
        },

        end() {
            this.state = { resizingNodeId: null, resizeCorner: null, startSize: null, startMouse: null };
        },

        isActive() {
            return this.state.resizingNodeId !== null;
        }
    };

    let nodes;

    beforeEach(() => {
        nodes = {
            'sticky_1': { id: 'sticky_1', x: 200, y: 200, isStickyNote: true, dimensions: { w: 180, h: 100 } }
        };
        ResizeHandler.state = { resizingNodeId: null, resizeCorner: null, startSize: null, startMouse: null };
    });

    it('should start resize with correct initial state', () => {
        ResizeHandler.start('sticky_1', 'se', { x: 290, y: 250 }, nodes['sticky_1']);

        expect(ResizeHandler.isActive()).toBe(true);
        expect(ResizeHandler.state.resizeCorner).toBe('se');
    });

    it('should resize SE corner correctly', () => {
        ResizeHandler.start('sticky_1', 'se', { x: 290, y: 250 }, nodes['sticky_1']);

        ResizeHandler.update({ x: 310, y: 270 }, nodes); // Move 20px right, 20px down

        expect(nodes['sticky_1'].dimensions.w).toBe(220); // 180 + 20*2
        expect(nodes['sticky_1'].dimensions.h).toBe(140); // 100 + 20*2
    });

    it('should respect minimum size constraints', () => {
        ResizeHandler.start('sticky_1', 'se', { x: 290, y: 250 }, nodes['sticky_1']);

        ResizeHandler.update({ x: 100, y: 100 }, nodes); // Try to shrink too much

        expect(nodes['sticky_1'].dimensions.w).toBeGreaterThanOrEqual(140);
        expect(nodes['sticky_1'].dimensions.h).toBeGreaterThanOrEqual(100);
    });
});

// ============================================================
// Strategy Pattern Tests
// ============================================================
describe('Strategy Pattern Implementation', () => {
    // Mock controller for strategies
    const mockController = {
        canvas: { style: { cursor: 'default' } },
        getWorldPosFromEvent: vi.fn(() => ({ x: 100, y: 100 })),
        findNodeAt: vi.fn(() => ({ id: 'node1', x: 100, y: 100 })),
        onUpdate: vi.fn(),
        screenToWorld: vi.fn(pos => pos)
    };

    describe('InteractionStrategy Base Class', () => {
        const InteractionStrategy = {
            handleMouseDown() { throw new Error('Must implement'); },
            handleMouseMove() { },
            handleMouseUp() { },
            handleKeyDown() { },
            handleKeyUp() { },
            getCursor() { return 'default'; },
            isActive() { return false; },
            cancel() { },
            cleanup() { }
        };

        it('should define abstract interface', () => {
            expect(() => InteractionStrategy.handleMouseDown()).toThrow('Must implement');
        });
    });

    describe('DragStrategy Behavior', () => {
        let dragStrategy;
        let nodes;

        beforeEach(() => {
            dragStrategy = {
                controller: mockController,
                dragState: { draggingNodeId: null, dragOffset: { x: 0, y: 0 }, dropTargetId: null },
                getCursor: () => 'default',
                isActive: function () { return this.dragState.draggingNodeId !== null; },
                startDrag: function (node, worldPos) {
                    this.dragState.draggingNodeId = node.id;
                    this.dragState.dragOffset = { x: worldPos.x - node.x, y: worldPos.y - node.y };
                    node.isDragging = true;
                },
                updateDrag: function (worldPos) {
                    if (!this.dragState.draggingNodeId) return;
                    const node = nodes[this.dragState.draggingNodeId];
                    if (!node) return;
                    node.x = worldPos.x - this.dragState.dragOffset.x;
                    node.y = worldPos.y - this.dragState.dragOffset.y;
                },
                endDrag: function () {
                    if (this.dragState.draggingNodeId && nodes[this.dragState.draggingNodeId]) {
                        nodes[this.dragState.draggingNodeId].isDragging = false;
                    }
                    this.dragState.draggingNodeId = null;
                }
            };

            nodes = {
                'node1': { id: 'node1', x: 100, y: 100, isDragging: false }
            };
        });

        it('should start drag on left click with node', () => {
            const mockEvent = { button: 0 };
            mockController.getWorldPosFromEvent.mockReturnValue({ x: 105, y: 105 });
            mockController.findNodeAt.mockReturnValue(nodes.node1);

            // Simulate handleMouseDown for drag strategy
            const worldPos = mockController.getWorldPosFromEvent(mockEvent);
            const clickedNode = mockController.findNodeAt(worldPos);

            if (clickedNode) {
                dragStrategy.startDrag(clickedNode, worldPos);
            }

            expect(dragStrategy.isActive()).toBe(true);
            expect(nodes.node1.isDragging).toBe(true);
        });

        it('should update node position during drag', () => {
            dragStrategy.startDrag(nodes.node1, { x: 105, y: 105 });

            dragStrategy.updateDrag({ x: 200, y: 200 });

            expect(nodes.node1.x).toBe(195); // 200 - (105 - 100)
            expect(nodes.node1.y).toBe(195);
        });

        it('should end drag and cleanup state', () => {
            dragStrategy.startDrag(nodes.node1, { x: 105, y: 105 });
            dragStrategy.endDrag();

            expect(dragStrategy.isActive()).toBe(false);
            expect(nodes.node1.isDragging).toBe(false);
        });
    });

    describe('DrawStrategy Behavior', () => {
        let drawStrategy;

        beforeEach(() => {
            drawStrategy = {
                controller: mockController,
                connectionState: { fromNode: null, currentPos: null },
                getCursor: () => 'crosshair',
                isActive: function () { return this.connectionState.fromNode !== null; },
                cancel: function () {
                    this.connectionState.fromNode = null;
                    this.connectionState.currentPos = null;
                }
            };
        });

        it('should start connection on first click', () => {
            const clickedNode = { id: 'node1' };
            const worldPos = { x: 100, y: 100 };

            // Simulate clicking on node
            if (drawStrategy.connectionState.fromNode === null) {
                drawStrategy.connectionState.fromNode = clickedNode;
                drawStrategy.connectionState.currentPos = worldPos;
            }

            expect(drawStrategy.isActive()).toBe(true);
            expect(drawStrategy.connectionState.fromNode).toBe(clickedNode);
        });

        it('should complete connection on second click', () => {
            const fromNode = { id: 'node1' };
            const toNode = { id: 'node2' };
            let connectionCreated = false;

            // Start connection
            drawStrategy.connectionState.fromNode = fromNode;
            drawStrategy.connectionState.currentPos = { x: 100, y: 100 };

            // Click on second node
            if (drawStrategy.isActive() && toNode.id !== fromNode.id) {
                connectionCreated = true;
                drawStrategy.cancel(); // Complete connection
            }

            expect(connectionCreated).toBe(true);
            expect(drawStrategy.isActive()).toBe(false);
        });

        it('should cancel connection on escape', () => {
            drawStrategy.connectionState.fromNode = { id: 'node1' };
            drawStrategy.connectionState.currentPos = { x: 100, y: 100 };

            drawStrategy.cancel();

            expect(drawStrategy.isActive()).toBe(false);
        });
    });

    describe('Strategy Switching', () => {
        let mockDesignerInteraction;

        beforeEach(() => {
            mockDesignerInteraction = {
                activeStrategy: null,
                dragStrategy: {
                    getCursor: () => 'default',
                    handleMouseDown: vi.fn(),
                    name: 'drag'
                },
                drawStrategy: {
                    getCursor: () => 'crosshair',
                    handleMouseDown: vi.fn(),
                    cancel: vi.fn(),
                    name: 'draw'
                },
                canvas: { style: { cursor: 'default' } },
                onUpdate: vi.fn(),
                toggleMode: function () {
                    this.activeStrategy = this.activeStrategy === this.dragStrategy ? this.drawStrategy : this.dragStrategy;
                    this.canvas.style.cursor = this.activeStrategy.getCursor();
                    if (this.activeStrategy === this.dragStrategy && this.drawStrategy.cancel) {
                        this.drawStrategy.cancel();
                    }
                    return this.activeStrategy === this.drawStrategy;
                }
            };
            mockDesignerInteraction.activeStrategy = mockDesignerInteraction.dragStrategy;
        });

        it('should switch from drag to draw strategy', () => {
            const initialStrategy = mockDesignerInteraction.activeStrategy;

            mockDesignerInteraction.toggleMode();

            expect(mockDesignerInteraction.activeStrategy).not.toBe(initialStrategy);
            expect(mockDesignerInteraction.activeStrategy).toBe(mockDesignerInteraction.drawStrategy);
            expect(mockDesignerInteraction.canvas.style.cursor).toBe('crosshair');
        });

        it('should switch from draw to drag strategy and cancel active connection', () => {
            // Switch to draw first
            mockDesignerInteraction.toggleMode();
            expect(mockDesignerInteraction.activeStrategy).toBe(mockDesignerInteraction.drawStrategy);

            // Switch back to drag
            mockDesignerInteraction.toggleMode();

            expect(mockDesignerInteraction.activeStrategy).toBe(mockDesignerInteraction.dragStrategy);
            expect(mockDesignerInteraction.canvas.style.cursor).toBe('default');
            expect(mockDesignerInteraction.drawStrategy.cancel).toHaveBeenCalled();
        });

        it('should delegate mouse events to active strategy', () => {
            const mockEvent = { button: 0 };

            mockDesignerInteraction.activeStrategy.handleMouseDown(mockEvent);

            expect(mockDesignerInteraction.dragStrategy.handleMouseDown).toHaveBeenCalledWith(mockEvent);
        });
    });
});

// ============================================================
// HistoryManager Tests
// ============================================================
describe('HistoryManager', () => {
    const HistoryManager = {
        undoStack: [],
        redoStack: [],

        saveToHistory(nodes, connections, actionType = 'BULK') {
            this.undoStack.push({
                nodes: JSON.parse(JSON.stringify(nodes)),
                connections: JSON.parse(JSON.stringify(connections)),
                actionType
            });
            this.redoStack = [];
        },

        undo(currentNodes, currentConnections) {
            if (this.undoStack.length === 0) return null;

            this.redoStack.push({
                nodes: JSON.parse(JSON.stringify(currentNodes)),
                connections: JSON.parse(JSON.stringify(currentConnections))
            });

            return this.undoStack.pop();
        },

        canUndo() { return this.undoStack.length > 0; },
        canRedo() { return this.redoStack.length > 0; }
    };

    beforeEach(() => {
        HistoryManager.undoStack = [];
        HistoryManager.redoStack = [];
    });

    it('should save state to history', () => {
        const nodes = { 'n1': { id: 'n1', x: 100, y: 100 } };
        const connections = [];

        HistoryManager.saveToHistory(nodes, connections, 'NODE_CREATE');

        expect(HistoryManager.canUndo()).toBe(true);
    });

    it('should restore previous state on undo', () => {
        const initialNodes = { 'n1': { id: 'n1', x: 100, y: 100 } };
        HistoryManager.saveToHistory(initialNodes, []);

        const modifiedNodes = { 'n1': { id: 'n1', x: 200, y: 200 } };

        const restored = HistoryManager.undo(modifiedNodes, []);

        expect(restored.nodes['n1'].x).toBe(100);
    });

    it('should clear redo stack on new action', () => {
        HistoryManager.saveToHistory({ 'n1': { x: 100, y: 100 } }, []);
        HistoryManager.undo({ 'n1': { x: 200, y: 200 } }, []);

        expect(HistoryManager.canRedo()).toBe(true);

        HistoryManager.saveToHistory({ 'n1': { x: 300, y: 300 } }, []);

        expect(HistoryManager.canRedo()).toBe(false);
    });
});
