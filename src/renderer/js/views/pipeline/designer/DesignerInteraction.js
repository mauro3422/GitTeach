import { DesignerCanvas } from './DesignerCanvas.js';
import { PanZoomHandler } from './interaction/PanZoomHandler.js';
import { ResizeHandler } from './interaction/ResizeHandler.js';
import { CoordinateUtils } from './CoordinateUtils.js';
import { GeometryUtils } from './GeometryUtils.js';
import { VisualStateManager } from './modules/VisualStateManager.js';
import { InputManager } from './modules/InputManager.js';
import { DragStrategy } from './strategies/DragStrategy.js';
import { DrawStrategy } from './strategies/DrawStrategy.js';
import { DesignerStore } from './modules/DesignerStore.js';

export const DesignerInteraction = {
    // Sanity Check: Strategy Pattern v2 active
    canvas: null,
    DEBUG_INTERACTION: true, // Habilitar logs de hit-detection para depuración
    /**
     * @type {() => Object} - Returns the current nodes object
     */
    nodeProvider: null,

    // Dynamic getter for nodes to ensure freshness
    get nodes() {
        return this.nodeProvider ? this.nodeProvider() : {};
    },

    // Active interaction strategy
    activeStrategy: null,
    dragStrategy: null,
    drawStrategy: null,
    hoveredNodeId: null, // Track mouse over node

    // Compatibility getter - delegates to PanZoomHandler instance
    get state() {
        return this.panZoomHandler ? this.panZoomHandler.getState() : { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 };
    },

    // Compatibility getter - delegates to active draw strategy
    get activeConnection() {
        return this.drawStrategy ? this.drawStrategy.getConnectionState() : null;
    },

    /**
     * Returns the current interaction state for VisualStateManager
     * @returns {Object} Interaction state object
     */
    getInteractionState() {
        return {
            hoveredId: this.hoveredNodeId,
            selectedId: null, // TODO: Implement selection
            draggingId: this.dragStrategy?.isActive() ? this.dragStrategy.dragState.draggingNodeId : null,
            activeConnectionId: this.drawStrategy?.isActive() ? this.drawStrategy.connectionState.fromNode?.id : null,
            resizingId: this.resizeHandler?.isActive() ? this.resizeHandler.getState().resizingNodeId : null
        };
    },

    /**
     * Get visual state for a specific node using VisualStateManager
     * @param {Object} node - Node to evaluate
     * @returns {Object} Visual state {opacity, scale, glowIntensity, borderWidth, zIndex, state}
     */
    getVisualState(node) {
        return VisualStateManager.getVisualState(node, this.getInteractionState());
    },

    init(canvas, nodeProvider, onUpdate, onConnection, onNodeDoubleClick, onNodeDrop, onStickyNoteEdit, onInteractionEnd) {
        this.canvas = canvas;
        this.nodeProvider = typeof nodeProvider === 'function' ? nodeProvider : () => nodeProvider; // Backwards combatibility

        // Safety check
        if (!this.nodes || Object.keys(this.nodes).length === 0) {
            console.warn('[DesignerInteraction] Initialized with empty nodes. Interaction may fail until nodes are loaded.');
        }

        this.onUpdate = onUpdate;
        this.onConnection = onConnection;
        this.onNodeDoubleClick = onNodeDoubleClick;
        this.onNodeDrop = onNodeDrop;
        this.onStickyNoteEdit = onStickyNoteEdit;
        this.onInteractionEnd = onInteractionEnd;

        // Instantiate strategies
        this.dragStrategy = new DragStrategy(this);
        this.drawStrategy = new DrawStrategy(this);
        this.activeStrategy = this.dragStrategy; // Default to drag strategy

        // Instantiate legacy handlers for compatibility
        this.resizeHandler = new ResizeHandler(this);
        this.panZoomHandler = new PanZoomHandler(this);

        // Initialize interaction modules
        this.panZoomHandler.init({ panOffset: { x: 0, y: 0 }, zoomScale: 1.5 });

        // Initialize InputManager with all handlers
        InputManager.init(this.canvas, {
            onMouseDown: (e) => this.handleMouseDown(e),
            onMouseMove: (e) => this.handleMouseMove(e),
            onMouseUp: (e) => this.handleMouseUp(e),
            onDoubleClick: (e) => this.handleDoubleClick(e),
            onWheel: (e) => this.handleWheel(e),
            onKeyDown: (e) => this._handleKeyDown(e),
            onKeyUp: (e) => this._handleKeyUp(e),
            onResize: () => this.handleResize()
        }, {
            windowMouseUp: true // Necesario para drag fuera del canvas
        });

        // Registrar shortcut para cambiar a DRAW strategy
        InputManager.registerShortcut('Control', 'DrawMode', () => {
            if (this.activeStrategy !== this.drawStrategy) {
                this.activeStrategy = this.drawStrategy;
                this.canvas.style.cursor = 'crosshair';
                this.onUpdate?.();
            }
        });

        // Registrar Undo/Redo shortcuts
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

        // 🧪 DEBUG MODE TOGGLE (Scientific Method)
        window.ENABLE_STICKY_DEBUG = () => {
            window.DEBUG_STICKY = true;
            console.log('[Scientific Method] 🔬 Sticky Debug Enabled. Seeing magenta hitboxes?');
            this.onUpdate();
        };
    },

    /**
     * Internal keyboard handlers for InputManager
     */
    _handleKeyDown(e) {
        // Delegate to active strategy
        if (this.activeStrategy && this.activeStrategy.handleKeyDown) {
            this.activeStrategy.handleKeyDown(e);
        }
    },

    _handleKeyUp(e) {
        // Delegate to active strategy
        if (this.activeStrategy && this.activeStrategy.handleKeyUp) {
            this.activeStrategy.handleKeyUp(e);
        }

        // Strategy switching logic
        if (e.key === 'Control') {
            if (this.activeStrategy === this.drawStrategy) {
                this.activeStrategy = this.dragStrategy;
                this.drawStrategy.cancel(); // Cancel any active connection
                this.canvas.style.cursor = 'default';
                this.onUpdate?.();
            }
        }
    },

    toggleMode() {
        this.activeStrategy = this.activeStrategy === this.dragStrategy ? this.drawStrategy : this.dragStrategy;
        this.canvas.style.cursor = this.activeStrategy.getCursor();
        if (this.activeStrategy === this.dragStrategy) {
            this.drawStrategy.cancel(); // Cancel any active connection when switching to drag
        }
        return this.activeStrategy === this.drawStrategy;
    },

    handleDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const worldPos = this.getWorldPosFromEvent(e);
        const clickedNode = this.findNodeAt(worldPos);

        if (clickedNode) {
            console.log(`[Interaction] 🚀 Double Click on: ${clickedNode.id} (Sticky: ${!!clickedNode.isStickyNote})`);
            if (clickedNode.isStickyNote && this.onStickyNoteEdit) {
                console.log(`[Interaction] 📝 Triggering StickyNote inline edit`);
                this.onStickyNoteEdit(clickedNode);
            } else if (this.onNodeDoubleClick) {
                console.log(`[Interaction] 🗒️ Triggering standard Node modal`);
                this.onNodeDoubleClick(clickedNode);
            }
        }
    },

    handleResize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.onUpdate?.();
    },

    cancelInteraction() {
        // Cancel active strategy
        if (this.activeStrategy && this.activeStrategy.cancel) {
            this.activeStrategy.cancel();
        }

        // Cancel legacy handlers for compatibility
        this.resizeHandler.cancel();
        this.panZoomHandler.cancel();

        this.onUpdate?.();
    },

    centerOnNode(nodeId, drawerWidth = 0) {
        this.panZoomHandler.centerOnNode(this.nodes[nodeId], { width: window.innerWidth, height: window.innerHeight }, drawerWidth);
    },

    getMousePos(e) {
        return CoordinateUtils.getMouseScreenPos(e, this.canvas);
    },

    /** @typedef {{x: number, y: number}} WorldPos */
    /** @typedef {{x: number, y: number}} ScreenPos */

    /**
     * Helper to get world coordinates directly from a DOM event
     * @param {MouseEvent|PointerEvent|TouchEvent} e 
     * @returns {WorldPos}
     */
    getWorldPosFromEvent(e) {
        return this.screenToWorld(this.getMousePos(e));
    },

    /**
     * Map screen coordinates to world coordinates
     * @param {ScreenPos} pos
     * @returns {WorldPos}
     */
    screenToWorld(pos) {
        return CoordinateUtils.screenToWorld(pos, this.state); // Use this.state which delegates to handler
    },

    /**
     * Map world coordinates to screen coordinates
     * @param {WorldPos} pos
     * @returns {ScreenPos}
     */
    worldToScreen(pos) {
        return CoordinateUtils.worldToScreen(pos, this.state); // Use this.state which delegates to handler
    },

    /**
     * Find the top-most node at a world position
     * Delegado al Store para centralizar lógica de colecciones
     * @param {WorldPos} worldPos 
     * @param {string|null} excludeId 
     * @returns {Object|null}
     */
    findNodeAt(worldPos, excludeId = null) {
        const node = DesignerStore.findNodeAt(worldPos, excludeId, this.state.zoomScale);

        // Debug logging for hit detection failures (Only if worldPos is within typical range)
        if (!node && this.DEBUG_INTERACTION) {
            console.log(`[HitTest] No node found at WorldPos: (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
        } else if (node && this.DEBUG_INTERACTION) {
            console.log(`[HitTest] Hit: ${node.id} at (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
        }

        return node;
    },

    handleMouseDown(e) {
        // PANNING priority (bypass strategy)
        if (e.button === 1 || e.button === 2) {
            this.panZoomHandler.start(e, { rawPos: this.getMousePos(e) });
            return;
        }

        // RESIZE priority (bypass strategy)
        if (e.button === 0) {
            const worldPos = this.getWorldPosFromEvent(e);
            const resizeHit = this.resizeHandler.findResizeHandle(worldPos);
            if (resizeHit) {
                this.resizeHandler.start(e, { nodeId: resizeHit.nodeId, corner: resizeHit.corner, initialPos: worldPos });
                return;
            }
        }

        // Delegate to active strategy
        if (this.activeStrategy && this.activeStrategy.handleMouseDown) {
            this.activeStrategy.handleMouseDown(e);
        }
    },

    handleMouseMove(e) {
        const worldPos = this.getWorldPosFromEvent(e);
        const resizeHit = this.resizeHandler.findResizeHandle(worldPos);

        // Cursor Management
        if (resizeHit) {
            this.canvas.style.cursor = this.resizeHandler.getResizeCursor(resizeHit.corner);
        } else if (!this.resizeHandler.isActive()) {
            // Use active strategy cursor
            this.canvas.style.cursor = this.activeStrategy ? this.activeStrategy.getCursor() : 'default';
        }

        // Handle resize (priority)
        if (this.resizeHandler.isActive()) {
            this.resizeHandler.update(e);
            this.onUpdate();
        }
        // Handle panning
        else if (this.panZoomHandler.isActive()) {
            this.panZoomHandler.update(e);
            this.onUpdate();
        }
        // Delegate to active strategy
        else if (this.activeStrategy && this.activeStrategy.handleMouseMove) {
            this.activeStrategy.handleMouseMove(e);
        }

        // Update hover state (always)
        const overNode = this.findNodeAt(worldPos);
        const newHoverId = overNode ? overNode.id : null;
        if (this.hoveredNodeId !== newHoverId) {
            this.hoveredNodeId = newHoverId;
            this.onUpdate();
        }
    },

    handleMouseUp(e) { // 'e' might be undefined if window listener calls it, check usage
        // Handle panning end
        if (this.panZoomHandler.isActive()) {
            this.panZoomHandler.end(e);
        }

        // Handle resize end
        if (this.resizeHandler.isActive()) {
            this.resizeHandler.end(e);
            this.canvas.style.cursor = 'default';
        }

        // Delegate to active strategy
        if (this.activeStrategy && this.activeStrategy.handleMouseUp) {
            this.activeStrategy.handleMouseUp(e);
        }

        // Cleanup temporary state in the store (Issue #5)
        DesignerStore.validateAndCleanup();
        this.onUpdate();

        if (this.onInteractionEnd) this.onInteractionEnd();
    },

    handleWheel(e) {
        e.preventDefault();
        this.panZoomHandler.handleWheel(e, this.onUpdate);

        // Update zoom indicator
        const indicator = document.getElementById('zoom-value');
        if (indicator) {
            indicator.textContent = `${Math.round(this.state.zoomScale * 100)}%`;
        }
    }
};
