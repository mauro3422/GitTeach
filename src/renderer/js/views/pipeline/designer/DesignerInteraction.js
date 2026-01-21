import { DesignerCanvas } from './DesignerCanvas.js';
import { PanZoomHandler } from './interaction/PanZoomHandler.js';
import { DragHandler } from './interaction/DragHandler.js';
import { ResizeHandler } from './interaction/ResizeHandler.js';
import { ConnectionDrawer } from './interaction/ConnectionDrawer.js';

export const DesignerInteraction = {
    canvas: null,
    nodes: null,
    onUpdate: null,
    onConnection: null,
    onNodeDoubleClick: null,
    onNodeDrop: null,
    onStickyNoteEdit: null,
    onInteractionEnd: null,

    // Compatibility getter - delegates to PanZoomHandler
    get state() {
        return PanZoomHandler.state;
    },

    // Compatibility getter - delegates to ConnectionDrawer
    get activeConnection() {
        return ConnectionDrawer.activeConnection;
    },

    // Interaction mode
    mode: 'DRAG', // 'DRAG' or 'DRAW'
    hoveredNodeId: null, // Track mouse over node

    init(canvas, nodes, onUpdate, onConnection, onNodeDoubleClick, onNodeDrop, onStickyNoteEdit, onInteractionEnd) {
        this.canvas = canvas;
        this.nodes = nodes;
        this.onUpdate = onUpdate;
        this.onConnection = onConnection;
        this.onNodeDoubleClick = onNodeDoubleClick;
        this.onNodeDrop = onNodeDrop;
        this.onStickyNoteEdit = onStickyNoteEdit;
        this.onInteractionEnd = onInteractionEnd;

        // Initialize interaction modules
        PanZoomHandler.init({ panOffset: { x: 0, y: 0 }, zoomScale: 1.5 });
        DragHandler.init(nodes);
        ResizeHandler.init(nodes);
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
            if (clickedNode.isStickyNote && this.onStickyNoteEdit) {
                this.onStickyNoteEdit(clickedNode);
            } else if (this.onNodeDoubleClick) {
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
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    },

    screenToWorld(pos) {
        return PanZoomHandler.screenToWorld(pos);
    },

    worldToScreen(pos) {
        return PanZoomHandler.worldToScreen(pos);
    },

    findNodeAt(worldPos, excludeId = null) {
        const nodeList = Object.values(this.nodes);

        // PASS 0: Check sticky notes FIRST (rectangular hit detection)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (!node.isStickyNote) continue;

            const w = (node.width || 180) / 2;
            const h = (node.height || 100) / 2;
            if (worldPos.x >= node.x - w && worldPos.x <= node.x + w &&
                worldPos.y >= node.y - h && worldPos.y <= node.y + h) {
                return node;
            }
        }

        // PASS 1: Check non-container, non-sticky nodes (circular)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (node.isRepoContainer || node.isStickyNote) continue;

            // Use the same dynamic radius as rendering for pixel-perfect hit detection
            const radius = DesignerCanvas.getNodeRadius(node, PanZoomHandler.state.zoomScale);
            const dist = Math.sqrt((node.x - worldPos.x) ** 2 + (node.y - worldPos.y) ** 2);
            if (dist < radius) return node;
        }

        // PASS 2: Check containers (only if no node was found)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (!node.isRepoContainer) continue;

            const bounds = DesignerCanvas.getContainerBounds(node, this.nodes, PanZoomHandler.state.zoomScale);
            const w = bounds.w + 10;
            const h = bounds.h + 10;
            if (worldPos.x >= node.x - w / 2 && worldPos.x <= node.x + w / 2 &&
                worldPos.y >= node.y - h / 2 && worldPos.y <= node.y + h / 2) {
                return node;
            }
        }

        return null;
    },

    // Check if worldPos is over a resize handle of any container or sticky note
    findResizeHandle(worldPos) {
        const handleSize = 12;
        for (const node of Object.values(this.nodes).slice().reverse()) {
            if (!node.isRepoContainer && !node.isStickyNote) continue;

            let w, h;
            if (node.isRepoContainer) {
                const bounds = DesignerCanvas.getContainerBounds(node, this.nodes, PanZoomHandler.state.zoomScale);
                w = bounds.w;
                h = bounds.h;
            } else {
                w = node.width || 180;
                h = node.height || 100;
            }

            const corners = {
                'nw': { x: node.x - w / 2, y: node.y - h / 2 },
                'ne': { x: node.x + w / 2, y: node.y - h / 2 },
                'sw': { x: node.x - w / 2, y: node.y + h / 2 },
                'se': { x: node.x + w / 2, y: node.y + h / 2 }
            };
            for (const [corner, pos] of Object.entries(corners)) {
                if (Math.abs(worldPos.x - pos.x) < handleSize && Math.abs(worldPos.y - pos.y) < handleSize) {
                    return { nodeId: node.id, corner, w, h };
                }
            }
        }
        return null;
    },

    handleMouseDown(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        // PANNING (Middle or Right button)
        if (e.button === 1 || e.button === 2) {
            PanZoomHandler.startPan(rawPos);
            return;
        }

        // LEFT CLICK
        if (e.button === 0) {
            // Priority 1: Resize handles
            const resizeHandle = ResizeHandler.findResizeHandle(worldPos);
            if (resizeHandle) {
                ResizeHandler.startResize(resizeHandle.nodeId, resizeHandle.corner, worldPos);
                return;
            }

            // Priority 2: Node interactions
            const clickedNode = this.findNodeAt(worldPos);
            if (clickedNode) {
                if (this.mode === 'DRAG') {
                    DragHandler.startDrag(clickedNode.id, worldPos);
                } else if (this.mode === 'DRAW') {
                    ConnectionDrawer.handleClick(worldPos, this.nodes, this.onConnection);
                }
            }
            this.onUpdate();
        }
    },

    handleMouseMove(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        // Cursor feedback for resize handles
        const resizeHandle = ResizeHandler.findResizeHandle(worldPos);
        if (resizeHandle) {
            this.canvas.style.cursor = ResizeHandler.getResizeCursor(resizeHandle.corner);
        } else if (!ResizeHandler.isResizing()) {
            this.canvas.style.cursor = 'default';
        }

        // Handle interactions in priority order
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

        // Update hovered node
        const overNode = this.findNodeAt(worldPos);
        const newHoverId = overNode ? overNode.id : null;
        if (this.hoveredNodeId !== newHoverId) {
            this.hoveredNodeId = newHoverId;
            Object.values(this.nodes).forEach(n => n.isHovered = (n.id === newHoverId));
            this.onUpdate();
        }
    },

    handleMouseUp() {
        PanZoomHandler.endPan();

        if (ResizeHandler.isResizing()) {
            ResizeHandler.endResize();
            this.canvas.style.cursor = 'default';
            this.onUpdate();
            return;
        }

        if (this.mode === 'DRAG' && DragHandler.isDragging()) {
            DragHandler.endDrag(this.onNodeDrop);
            this.onUpdate();
        }

        this.onUpdate();
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
