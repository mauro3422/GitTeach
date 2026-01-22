import { DesignerCanvas } from './DesignerCanvas.js';
import { PanZoomHandler } from './interaction/PanZoomHandler.js';
import { DragHandler } from './interaction/DragHandler.js';
import { ResizeHandler } from './interaction/ResizeHandler.js';
import { ConnectionDrawer } from './interaction/ConnectionDrawer.js';
import { CanvasUtils } from './CanvasUtils.js';

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

    // Compatibility getter - delegates to PanZoomHandler
    get state() {
        return PanZoomHandler.state;
    },

    // Compatibility getter - delegates to ConnectionDrawer
    get activeConnection() {
        return ConnectionDrawer.activeConnection;
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

        // Initialize interaction modules
        PanZoomHandler.init({ panOffset: { x: 0, y: 0 }, zoomScale: 1.5 });
        DragHandler.init(this.nodeProvider);
        ResizeHandler.init(this.nodeProvider);
        ConnectionDrawer.init(canvas);

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Ctrl key hold for DRAW mode
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Control' && this.mode !== 'DRAW') {
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
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Control' && this.mode === 'DRAW') {
                this.mode = 'DRAG';
                ConnectionDrawer.cancelConnection();
                this.canvas.style.cursor = 'default';
                this.onUpdate?.();
            }
        });
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
        DragHandler.cancelDrag();
        ConnectionDrawer.cancelConnection();
        this.onUpdate();
    },

    centerOnNode(nodeId, drawerWidth = 0) {
        PanZoomHandler.centerOnNode(this.nodes[nodeId], { width: window.innerWidth, height: window.innerHeight }, drawerWidth);
    },

    getMousePos(e) {
        return CanvasUtils.getMouseScreenPos(e, this.canvas);
    },

    /** @typedef {{x: number, y: number}} WorldPos */
    /** @typedef {{x: number, y: number}} ScreenPos */

    /**
     * Map screen coordinates to world coordinates
     * @param {ScreenPos} pos
     * @returns {WorldPos}
     */
    screenToWorld(pos) {
        return CanvasUtils.screenToWorld(pos, PanZoomHandler.state);
    },

    /**
     * Map world coordinates to screen coordinates
     * @param {WorldPos} pos
     * @returns {ScreenPos}
     */
    worldToScreen(pos) {
        return CanvasUtils.worldToScreen(pos, PanZoomHandler.state);
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

        // PASS 0: Sticky Notes - ULTRA PRIORITY (Checked before any other Node or Container)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;

            const isSticky = node.isStickyNote === true || node.id?.startsWith('sticky_');
            if (!isSticky) continue;

            // Sync with renderer dims (Match visual box)
            const dims = node.dimensions || {};
            const w = dims.animW || dims.w || 180;
            const h = dims.animH || dims.h || 100;
            const hw = w / 2;
            const hh = h / 2;

            // Hit area with 20px "Magnetic" buffer
            const margin = 20;
            const hit = worldPos.x >= node.x - hw - margin && worldPos.x <= node.x + hw + margin &&
                worldPos.y >= node.y - hh - margin && worldPos.y <= node.y + hh + margin;

            if (hit) {
                return node;
            }
        }

        // PASS 1: Regular Nodes (Circular)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (node.isRepoContainer || node.isStickyNote) continue;

            const radius = DesignerCanvas.getNodeRadius(node, PanZoomHandler.state.zoomScale);
            const dist = Math.sqrt((node.x - worldPos.x) ** 2 + (node.y - worldPos.y) ** 2);
            if (dist < radius) {
                // console.log(`[Interaction] Hit Node: ${node.id}`);
                return node;
            }
        }

        // PASS 2: Containers
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (!node.isRepoContainer) continue;

            const bounds = DesignerCanvas.getContainerBounds(node, this.nodes, PanZoomHandler.state.zoomScale);
            const w = bounds.w + 10;
            const h = bounds.h + 10;

            const hit = worldPos.x >= bounds.centerX - w / 2 && worldPos.x <= bounds.centerX + w / 2 &&
                worldPos.y >= bounds.centerY - h / 2 && worldPos.y <= bounds.centerY + h / 2;

            if (hit) {
                // console.log(`[Interaction] Hit Container: ${node.id}`);
                return node;
            }
        }

        return null;
    },

    handleMouseDown(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        // PANNING
        if (e.button === 1 || e.button === 2) {
            PanZoomHandler.startPan(rawPos);
            return;
        }

        // LEFT CLICK
        if (e.button === 0) {
            // DRAW mode priority
            if (this.mode === 'DRAW') {
                const clickedNode = this.findNodeAt(worldPos);
                if (clickedNode && !clickedNode.isRepoContainer && !clickedNode.isStickyNote) {
                    ConnectionDrawer.handleClick(worldPos, clickedNode, this.onConnection);
                    this.onUpdate();
                    return;
                }
            }

            // RESIZE priority
            const resizeHandle = ResizeHandler.findResizeHandle(worldPos);
            if (resizeHandle) {
                ResizeHandler.startResize(resizeHandle.nodeId, resizeHandle.corner, worldPos);
                return;
            }

            // Interaction priority
            const clickedNode = this.findNodeAt(worldPos);
            if (clickedNode) {
                if (this.mode === 'DRAG') {
                    DragHandler.startDrag(clickedNode.id, worldPos);
                } else if (this.mode === 'DRAW') {
                    ConnectionDrawer.handleClick(worldPos, clickedNode, this.onConnection);
                }
            }
            this.onUpdate();
        }
    },

    handleMouseMove(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        const resizeHandle = ResizeHandler.findResizeHandle(worldPos);
        if (resizeHandle && (this.mode === 'DRAG' || ResizeHandler.isResizing())) {
            this.canvas.style.cursor = ResizeHandler.getResizeCursor(resizeHandle.corner);
        } else if (!ResizeHandler.isResizing()) {
            this.canvas.style.cursor = this.mode === 'DRAW' ? 'crosshair' : 'default';
        }

        if (ResizeHandler.isResizing()) {
            ResizeHandler.updateResize(worldPos, this.onUpdate);
        } else if (PanZoomHandler.state.isPanning) {
            PanZoomHandler.updatePan(rawPos);
            this.onUpdate();
        } else if (DragHandler.isDragging()) {
            DragHandler.updateDrag(worldPos, this.nodes);
            this.onUpdate();
        } else if (ConnectionDrawer.isDrawing()) {
            ConnectionDrawer.updateConnection(worldPos);
            this.onUpdate();
        }

        const overNode = this.findNodeAt(worldPos);
        const newHoverId = overNode ? overNode.id : null;
        if (this.hoveredNodeId !== newHoverId) {
            this.hoveredNodeId = newHoverId;
            this.onUpdate();
        }
    },

    handleMouseUp() {
        PanZoomHandler.endPan();

        if (ResizeHandler.isResizing()) {
            ResizeHandler.endResize();
            this.canvas.style.cursor = 'default';
        } else if (this.mode === 'DRAG' && DragHandler.isDragging()) {
            DragHandler.endDrag(this.onNodeDrop);
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
        const rawPos = this.getMousePos(e);
        PanZoomHandler.handleWheel(e.deltaY, rawPos, this.onUpdate);

        // Update zoom indicator
        const indicator = document.getElementById('zoom-value');
        if (indicator) {
            indicator.textContent = `${Math.round(PanZoomHandler.state.zoomScale * 100)}%`;
        }
    }
};
