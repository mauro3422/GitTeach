import { PanZoomHandler } from './interaction/PanZoomHandler.js';
import { ResizeHandler } from './interaction/ResizeHandler.js';
import { CoordinateUtils } from './CoordinateUtils.js';
import { VisualStateManager } from './modules/VisualStateManager.js';
import { InputManager } from './modules/InputManager.js';
import { DesignerStore } from './modules/DesignerStore.js';
import { StrategyManager } from './interaction/StrategyManager.js';
import { HoverManager } from './interaction/HoverManager.js';
import { ThemeManager } from '../../../core/ThemeManager.js';

export const DesignerInteraction = {
    canvas: null,
    DEBUG_INTERACTION: true,

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
    get hoveredNodeId() { return this.hoverManager.getHoveredNodeId(); },
    get state() { return this.panZoomHandler ? this.panZoomHandler.getState() : { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 }; },
    get activeConnection() { return this.strategyManager.getConnectionState(); },

    /**
     * Get visual state for a node (facade for VisualStateManager)
     */
    getInteractionState() {
        return {
            hoveredId: this.hoveredNodeId,
            selectedId: DesignerStore.state.interaction.selectedNodeId,
            selectedConnectionId: DesignerStore.state.interaction.selectedConnectionId,
            draggingId: this.strategyManager.getDragState()?.draggingNodeId,
            activeConnectionId: this.strategyManager.getConnectionState()?.fromNode?.id,
            resizingId: this.resizeHandler?.isActive() ? this.resizeHandler.getState().resizingNodeId : null
        };
    },

    getVisualState(node) {
        return VisualStateManager.getVisualState(node, this.getInteractionState());
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

        // Initialize Managers
        this.hoverManager = new HoverManager(this);
        this.strategyManager = new StrategyManager(this);
        this.resizeHandler = new ResizeHandler(this);
        this.panZoomHandler = new PanZoomHandler(this);

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

    handleMouseDown(e) {
        if (e.button === 1 || e.button === 2) {
            this.panZoomHandler.start(e, { rawPos: this.getMousePos(e) });
            return;
        }

        if (e.button === 0) {
            const worldPos = this.getWorldPosFromEvent(e);

            // 1. Check for Resize Handles
            const resizeHit = this.resizeHandler.findResizeHandle(worldPos);
            if (resizeHit) {
                this.resizeHandler.start(e, { nodeId: resizeHit.nodeId, corner: resizeHit.corner, initialPos: worldPos });
                DesignerStore.selectNode(resizeHit.nodeId); // Selection follows interaction
                return; // Exit here to prevent other interactions
            }

            // 2. Check for Panning (if Ctrl or Shift is pressed)
            if (e.ctrlKey || e.shiftKey) {
                this.panZoomHandler.start(e, { rawPos: this.getMousePos(e) });
                return; // Exit to prevent other interactions
            }

            // 3. Check for Node Selection/Drag
            const clickedNode = this.hoverManager.findNodeAt(worldPos);
            if (clickedNode) {
                // Only select if different from current selection
                if (DesignerStore.state.interaction.selectedNodeId !== clickedNode.id) {
                    DesignerStore.selectNode(clickedNode.id);
                }

                // For node clicks, don't immediately start drag strategy
                // Let handleMouseMove determine if drag should start based on movement threshold
                return; // Exit to prevent immediate drag start
            } else {
                // 4. Check for Connection Selection
                const clickedConn = DesignerStore.findConnectionAt(worldPos);
                if (clickedConn) {
                    DesignerStore.selectConnection(clickedConn);
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
        if (this.panZoomHandler.isActive()) this.panZoomHandler.end(e);
        if (this.resizeHandler.isActive()) {
            this.resizeHandler.end(e);
            this.canvas.style.cursor = 'default';
        }

        this.strategyManager.handleMouseUp(e);

        DesignerStore.validateAndCleanup();
        this.onUpdate();
        if (this.onInteractionEnd) this.onInteractionEnd();
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
