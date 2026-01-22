import { DesignerCanvas } from './DesignerCanvas.js';
import { PanZoomHandler } from './interaction/PanZoomHandler.js';
import { DragHandler } from './interaction/DragHandler.js';
import { ResizeHandler } from './interaction/ResizeHandler.js';
import { ConnectionHandler } from './interaction/ConnectionHandler.js';
import { CoordinateUtils } from './CoordinateUtils.js';
import { GeometryUtils } from './GeometryUtils.js';
import { VisualStateManager } from './modules/VisualStateManager.js';
import { InputManager } from './modules/InputManager.js';

export const DesignerInteraction = {
    canvas: null,
    /**
     * @type {() => Object} - Returns the current nodes object
     */
    nodeProvider: null,

    // Dynamic getter for nodes to ensure freshness
    get nodes() {
        return this.nodeProvider ? this.nodeProvider() : {};
    },

    // Interaction mode
    mode: 'DRAG', // 'DRAG' or 'DRAW'
    hoveredNodeId: null, // Track mouse over node

    // Compatibility getter - delegates to PanZoomHandler instance
    get state() {
        return this.panZoomHandler ? this.panZoomHandler.getState() : { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 };
    },

    // Compatibility getter - delegates to ConnectionHandler
    get activeConnection() {
        return (this.connectionHandler && this.connectionHandler.isActive()) ? this.connectionHandler.getState() : null;
    },

    /**
     * Returns the current interaction state for VisualStateManager
     * @returns {Object} Interaction state object
     */
    getInteractionState() {
        return {
            hoveredId: this.hoveredNodeId,
            selectedId: null, // TODO: Implement selection
            draggingId: this.dragHandler?.isActive() ? this.dragHandler.getState().draggingNodeId : null,
            activeConnectionId: this.connectionHandler?.isActive() ? this.connectionHandler.getState()?.fromNode?.id : null,
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

        // Instantiate Handlers
        this.dragHandler = new DragHandler(this);
        this.resizeHandler = new ResizeHandler(this);
        this.panZoomHandler = new PanZoomHandler(this);
        this.connectionHandler = new ConnectionHandler(this);

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
            onKeyUp: (e) => this._handleKeyUp(e)
        }, {
            windowMouseUp: true // Necesario para drag fuera del canvas
        });

        // Registrar shortcut para DRAW mode via InputManager
        InputManager.registerShortcut('Control', 'DrawMode', () => {
            if (this.mode !== 'DRAW') {
                this.mode = 'DRAW';
                this.canvas.style.cursor = 'crosshair';
                this.onUpdate?.();
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
        // Lógica actual de keydown - Ctrl para DRAW mode
        if (e.key === 'Control' && this.mode !== 'DRAW') {
            this.mode = 'DRAW';
            this.canvas.style.cursor = 'crosshair';
            this.onUpdate?.();
        }
    },

    _handleKeyUp(e) {
        if (e.key === 'Control' && this.mode === 'DRAW') {
            this.mode = 'DRAG';
            this.connectionHandler.cancel();
            this.canvas.style.cursor = 'default';
            this.onUpdate?.();
        }
    },

    toggleMode() {
        this.mode = this.mode === 'DRAG' ? 'DRAW' : 'DRAG';
        return this.mode === 'DRAW';
    },

    handleDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);
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

    cancelInteraction() {
        this.dragHandler.cancel();
        this.resizeHandler.cancel();
        this.connectionHandler.cancel();
        this.onUpdate();
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
     * @param {WorldPos} worldPos 
     * @param {string|null} excludeId 
     * @returns {Object|null}
     */
    findNodeAt(worldPos, excludeId = null) {
        if (!this.nodes) return null;
        const nodeList = Object.values(this.nodes);
        const zoomScale = this.state.zoomScale;

        // PASS 0: Sticky Notes - ULTRA PRIORITY
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            const isSticky = node.isStickyNote === true || node.id?.startsWith('sticky_');
            if (!isSticky) continue;

            // Hit area with 20px "Magnetic" buffer
            const margin = 20;
            const dims = node.dimensions || {};
            const rect = {
                x: node.x,
                y: node.y,
                w: (dims.animW || dims.w || 180) + margin * 2,
                h: (dims.animH || dims.h || 100) + margin * 2
            };

            if (GeometryUtils.isPointInRectangle(worldPos, rect)) return node;
        }

        // PASS 1: Regular Nodes (Circular)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (node.isRepoContainer || node.isStickyNote) continue;

            if (GeometryUtils.isPointInNode(worldPos, node, zoomScale)) return node;
        }

        // PASS 2: Containers
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (!node.isRepoContainer) continue;

            if (GeometryUtils.isPointInContainer(worldPos, node, this.nodes, zoomScale)) return node;
        }

        return null;
    },

    handleMouseDown(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        // PANNING
        if (e.button === 1 || e.button === 2) {
            this.panZoomHandler.start(e, { rawPos });
            return;
        }

        // LEFT CLICK
        if (e.button === 0) {
            // DRAW mode priority
            if (this.mode === 'DRAW') {
                const clickedNode = this.findNodeAt(worldPos);
                if (clickedNode && !clickedNode.isRepoContainer && !clickedNode.isStickyNote) {
                    this.connectionHandler.handleClick(e, clickedNode, this.onConnection);
                    this.onUpdate();
                    return;
                }
            }

            // RESIZE priority
            const resizeHit = this.resizeHandler.findResizeHandle(worldPos);
            if (resizeHit) {
                this.resizeHandler.start(e, { nodeId: resizeHit.nodeId, corner: resizeHit.corner, initialPos: worldPos });
                return;
            }

            // Interaction priority
            const clickedNode = this.findNodeAt(worldPos);
            if (clickedNode) {
                if (this.mode === 'DRAG') {
                    this.dragHandler.start(e, { nodeId: clickedNode.id, initialPos: worldPos });
                } else if (this.mode === 'DRAW') {
                    this.connectionHandler.handleClick(e, clickedNode, this.onConnection);
                }
            }
            this.onUpdate();
        }
    },

    handleMouseMove(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        const resizeHit = this.resizeHandler.findResizeHandle(worldPos);

        // Cursor Management
        if (resizeHit && (this.mode === 'DRAG' || this.resizeHandler.isActive())) {
            this.canvas.style.cursor = this.resizeHandler.getResizeCursor(resizeHit.corner);
        } else if (!this.resizeHandler.isActive()) {
            this.canvas.style.cursor = this.mode === 'DRAW' ? 'crosshair' : 'default';
        }

        if (this.resizeHandler.isActive()) {
            this.resizeHandler.update(e);
            this.onUpdate();
        } else if (this.panZoomHandler.isActive()) {
            this.panZoomHandler.update(e);
            this.onUpdate();
        } else if (this.dragHandler.isActive()) {
            this.dragHandler.update(e);
            this.onUpdate();
        } else if (this.connectionHandler.isDrawing()) {
            this.connectionHandler.update(e);
            this.onUpdate();
        }

        const overNode = this.findNodeAt(worldPos);
        const newHoverId = overNode ? overNode.id : null;
        if (this.hoveredNodeId !== newHoverId) {
            this.hoveredNodeId = newHoverId;
            this.onUpdate();
        }
    },

    handleMouseUp(e) { // 'e' might be undefined if window listener calls it, check usage
        if (this.panZoomHandler.isActive()) {
            this.panZoomHandler.end(e);
        }

        if (this.resizeHandler.isActive()) {
            this.resizeHandler.end(e);
            this.canvas.style.cursor = 'default';
        } else if (this.mode === 'DRAG' && this.dragHandler.isActive()) {
            this.dragHandler.end(e);
        }

        // Cleanup temporary state in the store (Issue #5)
        import('./modules/DesignerStore.js').then(({ DesignerStore }) => {
            DesignerStore.validateAndCleanup();
            this.onUpdate();
        });

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
