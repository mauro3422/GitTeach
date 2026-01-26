import { PanZoomHandler } from './interaction/PanZoomHandler.js';
import { ResizeHandler } from './interaction/ResizeHandler.js';
import { CoordinateUtils } from './CoordinateUtils.js';
import { NodeVisualManager } from './modules/NodeVisualManager.js';
import { InputManager } from './modules/InputManager.js';
import { nodeRepository } from './modules/stores/NodeRepository.js';
import { interactionState } from './modules/stores/InteractionState.js';
import { cameraState } from './modules/stores/CameraState.js';
import { DesignerStore } from './modules/DesignerStore.js';
import { StrategyManager } from './interaction/StrategyManager.js';
import { HoverManager } from './interaction/HoverManager.js';
import { ThemeManager } from '../../../core/ThemeManager.js';

export const DesignerInteraction = {
    canvas: null,
    DEBUG_INTERACTION: false,

    nodeProvider: null,
    get nodes() { return this.nodeProvider ? this.nodeProvider() : {}; },

    // Managers
    strategyManager: null,
    hoverManager: null,
    panZoomHandler: null,
    resizeHandler: null,

    // Public Getters (Facades)
    get dragStrategy() { return this.strategyManager.dragStrategy; },
    get drawStrategy() { return this.strategyManager.drawStrategy; },
    get activeStrategy() { return this.strategyManager.activeStrategy; },
    get hoveredNodeId() { return this.deps ? this.deps.interactionState.state.hoveredNodeId : null; },
    get state() { return this.deps ? this.deps.cameraState.state : { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 }; },
    get activeConnection() { return this.strategyManager.getConnectionState(); },

    /**
     * Get visual state for a node (facade for NodeVisualManager)
     */
    getInteractionState() {
        return this.deps ? this.deps.interactionState.state : interactionState.state;
    },

    getVisualState(node) {
        return NodeVisualManager.getNodeVisualState(node, this.getInteractionState());
    },

    init(canvas, nodeProvider, onUpdate, onConnection, onNodeDoubleClick, onNodeDrop, onStickyNoteEdit, onInteractionEnd, onDeleteNode) {
        this.canvas = canvas;
        this.nodeProvider = typeof nodeProvider === 'function' ? nodeProvider : () => nodeProvider;
        this.onUpdate = onUpdate;
        this.onConnection = onConnection;
        this.onNodeDoubleClick = onNodeDoubleClick;
        this.onNodeDrop = onNodeDrop;
        this.onStickyNoteEdit = onStickyNoteEdit;
        this.onInteractionEnd = onInteractionEnd;
        this.onDeleteNode = onDeleteNode;

        // Dependency Injection Object
        this.deps = {
            controller: this,
            nodeRepository,
            interactionState,
            cameraState
        };
        const deps = this.deps;

        // Initialize Managers with injected dependencies
        this.hoverManager = new HoverManager(deps);
        this.strategyManager = new StrategyManager(deps);
        this.resizeHandler = new ResizeHandler(deps);
        this.panZoomHandler = new PanZoomHandler(deps);

        this.panZoomHandler.init({ panOffset: { x: 0, y: 0 }, zoomScale: ThemeManager.instance.navigation.defaultZoom });

        this._setupInput();
        this._setupShortcuts();
    },

    _setupInput() {
        InputManager.init(this.canvas, {
            onMouseDown: (e) => this.handleMouseDown(e),
            onMouseMove: (e) => this.handleMouseMove(e),
            onMouseUp: (e) => this.handleMouseUp(e),
            onDoubleClick: (e) => this.handleDoubleClick(e),
            onWheel: (e) => this.handleWheel(e),
            onKeyDown: (e) => this.strategyManager.handleKeyDown(e),
            onKeyUp: (e) => this._handleKeyUp(e),
            onResize: () => this.handleResize()
        }, { windowMouseUp: true });
    },

    _setupShortcuts() {
        InputManager.registerShortcut('Control', 'DrawMode', () => {
            if (this.strategyManager.setDrawMode()) {
                this.canvas.style.cursor = 'crosshair';
                this.onUpdate?.();
            }
        });

        InputManager.registerShortcut('controlkey+keyz', 'Undo', () => {
            if (DesignerStore.undo()) {
                this.onUpdate?.();
                console.log('[Interaction] ⏪ Undo executed (Store)');
            }
        });

        InputManager.registerShortcut('controlkey+keyy', 'Redo', () => {
            if (DesignerStore.redo()) {
                this.onUpdate?.();
                console.log('[Interaction] ⏩ Redo executed (Store)');
            }
        });

        InputManager.registerShortcut('delete', 'DeleteNode', () => {
            if (this.onDeleteNode) this.onDeleteNode();
        });

        InputManager.registerShortcut('backspace', 'DeleteNode', () => {
            if (this.onDeleteNode) this.onDeleteNode();
        });

        // ROBUST PATTERN: Cancel all interactions on Escape
        InputManager.registerShortcut('escape', 'CancelInteractions', () => {
            DesignerStore.cancelAllInteractions();
            this.resizeHandler.cancel();
            this.panZoomHandler.cancel();
            this.strategyManager.cancel();
            this.canvas.style.cursor = 'default';
            this.onUpdate?.();
            console.log('[Interaction] ⏹ All interactions cancelled (Escape)');
        });
    },

    _handleKeyUp(e) {
        this.strategyManager.handleKeyUp(e);
        // Specialized mode switching logic
        if (e.key === 'Control') {
            if (this.strategyManager.setDragMode()) {
                this.canvas.style.cursor = 'default';
                this.onUpdate?.();
            }
        }
    },

    saveToHistory() {
        DesignerStore.savepoint();
    },

    handleMouseDown(e) {
        if (e.button === 1) {
            this.panZoomHandler.start(e, { rawPos: this.getMousePos(e) });
            return;
        }

        if (e.button === 0) {
            const worldPos = this.getWorldPosFromEvent(e);

            // 1. Check for Resize Handles (SKIP if Ctrl is pressed for DrawMode)
            const resizeHit = e.ctrlKey ? null : this.resizeHandler.findResizeHandle(worldPos);

            if (resizeHit) {
                // UNIFIED HISTORY: Create savepoint BEFORE resize starts (makes it undoable)
                DesignerStore.savepoint('NODE_RESIZE', { nodeId: resizeHit.nodeId });
                this.resizeHandler.start(e, { nodeId: resizeHit.nodeId, corner: resizeHit.corner, initialPos: worldPos });
                DesignerStore.selectNode(resizeHit.nodeId); // Selection follows interaction
                return; // Exit here to prevent other interactions
            }

            // 3. Check for Node Selection/Drag
            const clickedNode = this.hoverManager.findNodeAt(worldPos);
            if (clickedNode) {
                // ROBUST PATTERN: Create savepoint BEFORE any interaction
                DesignerStore.savepoint('NODE_MOVE', { nodeId: clickedNode.id });

                // Select the node if not already selected
                if (DesignerStore.getInteractionState().selectedNodeId !== clickedNode.id) {
                    DesignerStore.selectNode(clickedNode.id);
                }

                // CRITICAL FIX: Allow strategyManager to initiate drag
                // This enables dragging nodes, containers, and sticky notes
                this.strategyManager.handleMouseDown(e);
                return; // Exit to prevent other interactions
            } else {
                // 4. Check for Connection Selection
                const clickedConn = DesignerStore.findConnectionAt(worldPos);
                if (clickedConn) {
                    DesignerStore.selectConnection(clickedConn.id);
                } else {
                    DesignerStore.clearSelection();
                }

                // For empty space clicks, allow strategy manager to handle it (panning, etc.)
                this.strategyManager.handleMouseDown(e);
            }
        }
    },

    handleMouseMove(e) {
        const worldPos = this.getWorldPosFromEvent(e);

        // PERF: Skip resize check if already panning/resizing (saves ~50 ops/frame)
        const resizeHit = (this.panZoomHandler.isActive() || this.resizeHandler.isActive())
            ? null
            : this.resizeHandler.findResizeHandle(worldPos);

        // Cursor Logic
        if (resizeHit) {
            this.canvas.style.cursor = this.resizeHandler.getResizeCursor(resizeHit.corner);
        } else if (!this.resizeHandler.isActive()) {
            this.canvas.style.cursor = this.strategyManager.getCursor();
        }

        // Action Logic
        if (this.resizeHandler.isActive()) {
            this.resizeHandler.update(e);
            this.onUpdate();
        } else if (this.panZoomHandler.isActive()) {
            this.panZoomHandler.update(e);
            this.onUpdate();
        } else {
            this.strategyManager.handleMouseMove(e);
        }

        // PERF: Skip hover update during pan/resize (saves ~20 ops/frame)
        if (!this.panZoomHandler.isActive() && !this.resizeHandler.isActive()) {
            this.hoverManager.update(worldPos);
        }
    },

    handleMouseUp(e) {
        try {
            if (this.panZoomHandler.isActive()) this.panZoomHandler.end(e);
            if (this.resizeHandler.isActive()) {
                const nodeId = DesignerStore.getInteractionState().resizingNodeId;
                this.resizeHandler.end(e);
                this.canvas.style.cursor = 'default';

                // CRITICAL: Commit the final manual size to the Store
                if (nodeId && this.nodes[nodeId]) {
                    const node = this.nodes[nodeId];
                    const success = DesignerStore.updateNode(nodeId, {
                        dimensions: { ...node.dimensions }
                    });
                    if (!success) {
                        console.warn('[Interaction] Failed to update node dimensions after resize:', nodeId);
                    }
                }
            }
        } catch (err) {
            console.error('[Interaction] Error in handleMouseUp:', err);
        } finally {
            this.strategyManager.handleMouseUp(e);
            DesignerStore.validateAndCleanup();
            this.onUpdate();
            if (this.onInteractionEnd) this.onInteractionEnd();
        }
    },

    handleDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const worldPos = this.getWorldPosFromEvent(e);
        const clickedNode = this.hoverManager.findNodeAt(worldPos);

        if (clickedNode) {
            if (clickedNode.isStickyNote && this.onStickyNoteEdit) {
                this.onStickyNoteEdit(clickedNode);
            } else if (this.onNodeDoubleClick) {
                this.onNodeDoubleClick(clickedNode);
            }
        }
    },

    handleWheel(e) {
        e.preventDefault();
        this.panZoomHandler.handleWheel(e, this.onUpdate);
        const indicator = document.getElementById('zoom-value');
        if (indicator) indicator.textContent = `${Math.round(this.state.zoomScale * 100)}%`;
    },

    handleResize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.onUpdate?.();
        }
    },

    cancelInteraction() {
        this.strategyManager.cancel();
        this.resizeHandler.cancel();
        this.panZoomHandler.cancel();
        this.onUpdate?.();
    },

    centerOnNode(nodeId, drawerWidth = 0) {
        this.panZoomHandler.centerOnNode(this.nodes[nodeId], { width: window.innerWidth, height: window.innerHeight }, drawerWidth);
    },

    getMousePos(e) { return CoordinateUtils.getMouseScreenPos(e, this.canvas); },
    getWorldPosFromEvent(e) { return this.screenToWorld(this.getMousePos(e)); },
    screenToWorld(pos) {
        const navState = this.state || { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 };
        return CoordinateUtils.screenToWorld(pos, navState);
    },
    worldToScreen(pos) { return CoordinateUtils.worldToScreen(pos, this.state); }
};
