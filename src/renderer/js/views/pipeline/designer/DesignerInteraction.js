import { DesignerCanvas } from './DesignerCanvas.js';

export const DesignerInteraction = {
    canvas: null,
    nodes: null,
    onUpdate: null,
    onConnection: null, // NEW: Callback for when a connection is finished
    onNodeDoubleClick: null, // NEW: Callback for messaging
    onNodeDrop: null, // NEW: Callback for parenting
    draggedNodeId: null,
    dropTargetId: null, // Track potential parent container
    panAnimation: null, // Track active centering animation

    // Resize state
    resizingNodeId: null,
    resizeCorner: null, // 'nw' | 'ne' | 'sw' | 'se'
    resizeStartWorld: null,
    resizeStartSize: null,

    // NEW: Manual Connection state
    mode: 'DRAG', // 'DRAG' or 'DRAW'
    activeConnection: null, // { fromNode, currentPos }
    hoveredNodeId: null, // Track mouse over node

    state: {
        panOffset: { x: 0, y: 0 },
        zoomScale: 1.5, // Start zoomed in for better readability
        isPanning: false,
        lastPanPos: { x: 0, y: 0 },
        minZoom: 0.3,
        maxZoom: 4.0
    },

    init(canvas, nodes, onUpdate, onConnection, onNodeDoubleClick, onNodeDrop, onStickyNoteEdit) {
        this.canvas = canvas;
        this.nodes = nodes;
        this.onUpdate = onUpdate;
        this.onConnection = onConnection;
        this.onNodeDoubleClick = onNodeDoubleClick;
        this.onNodeDrop = onNodeDrop;
        this.onStickyNoteEdit = onStickyNoteEdit;

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
                this.activeConnection = null; // Cancel any in-progress connection
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
        if (this.draggedNodeId) {
            const node = this.nodes[this.draggedNodeId];
            if (node) node.isDragging = false;
            this.draggedNodeId = null;
        }
        this.activeConnection = null;
        this.onUpdate();
    },

    centerOnNode(nodeId, drawerWidth = 0) {
        const node = this.nodes[nodeId];
        if (!node) return;

        const targetX = (window.innerWidth - drawerWidth) / 2;
        const targetY = window.innerHeight / 2;

        const targetPanX = targetX - (node.x * this.state.zoomScale);
        const targetPanY = targetY - (node.y * this.state.zoomScale);

        this.animatePan(targetPanX, targetPanY);
    },

    animatePan(targetX, targetY) {
        if (this.panAnimation) cancelAnimationFrame(this.panAnimation);

        const startX = this.state.panOffset.x;
        const startY = this.state.panOffset.y;
        const duration = 400; // ms
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: easeOutCubic
            const ease = 1 - Math.pow(1 - progress, 3);

            this.state.panOffset.x = startX + (targetX - startX) * ease;
            this.state.panOffset.y = startY + (targetY - startY) * ease;

            this.onUpdate();

            if (progress < 1) {
                this.panAnimation = requestAnimationFrame(step);
            } else {
                this.panAnimation = null;
            }
        };

        this.panAnimation = requestAnimationFrame(step);
    },

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    },

    screenToWorld(pos) {
        return {
            x: (pos.x - this.state.panOffset.x) / this.state.zoomScale,
            y: (pos.y - this.state.panOffset.y) / this.state.zoomScale
        };
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
            const radius = DesignerCanvas.getNodeRadius(node, this.state.zoomScale);
            const dist = Math.sqrt((node.x - worldPos.x) ** 2 + (node.y - worldPos.y) ** 2);
            if (dist < radius) return node;
        }

        // PASS 2: Check containers (only if no node was found)
        for (const node of nodeList.slice().reverse()) {
            if (excludeId && node.id === excludeId) continue;
            if (!node.isRepoContainer) continue;

            const bounds = DesignerCanvas.getContainerBounds(node, this.nodes, this.state.zoomScale);
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
        for (const node of Object.values(this.nodes)) {
            if (!node.isRepoContainer && !node.isStickyNote) continue;

            let w, h;
            if (node.isRepoContainer) {
                const bounds = DesignerCanvas.getContainerBounds(node, this.nodes, this.state.zoomScale);
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
        if (this.panAnimation) {
            cancelAnimationFrame(this.panAnimation);
            this.panAnimation = null;
        }

        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        // PANNING (Middle or Right button)
        if (e.button === 1 || e.button === 2) {
            this.state.isPanning = true;
            this.state.lastPanPos = { ...rawPos };
            return;
        }

        // LEFT CLICK
        if (e.button === 0) {
            // Check for resize handle FIRST (priority over node drag)
            const resizeHandle = this.findResizeHandle(worldPos);
            if (resizeHandle) {
                this.resizingNodeId = resizeHandle.nodeId;
                this.resizeCorner = resizeHandle.corner;
                this.resizeStartWorld = { ...worldPos };
                this.resizeStartSize = { w: resizeHandle.w, h: resizeHandle.h };
                return;
            }

            const clickedNode = this.findNodeAt(worldPos);

            if (this.mode === 'DRAG' && clickedNode) {
                this.draggedNodeId = clickedNode.id;
                clickedNode.isDragging = true;
            } else if (this.mode === 'DRAW') {
                if (clickedNode) {
                    if (this.activeConnection) {
                        if (this.activeConnection.fromNode.id === clickedNode.id) {
                            // Toggle off if clicking the same node
                            this.activeConnection = null;
                        } else {
                            // Finish connection if clicking a different node
                            this.finishConnection(clickedNode);
                        }
                    } else {
                        // Start new connection
                        this.activeConnection = { fromNode: clickedNode, currentPos: worldPos };
                    }
                } else {
                    // Clicked empty space: cancel any active connection
                    this.activeConnection = null;
                }
            }
            this.onUpdate();
        }
    },

    handleMouseMove(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

        // Cursor feedback for resize handles
        const resizeHandle = this.findResizeHandle(worldPos);
        if (resizeHandle) {
            const cursor = (resizeHandle.corner === 'nw' || resizeHandle.corner === 'se') ? 'nwse-resize' : 'nesw-resize';
            this.canvas.style.cursor = cursor;
        } else if (!this.resizingNodeId) {
            this.canvas.style.cursor = 'default';
        }

        // RESIZING
        if (this.resizingNodeId) {
            const node = this.nodes[this.resizingNodeId];
            const dx = worldPos.x - this.resizeStartWorld.x;
            const dy = worldPos.y - this.resizeStartWorld.y;
            const minW = 60, minH = 40;

            let newW = this.resizeStartSize.w;
            let newH = this.resizeStartSize.h;

            // Apply delta based on corner
            if (this.resizeCorner === 'se') { newW += dx * 2; newH += dy * 2; }
            if (this.resizeCorner === 'sw') { newW -= dx * 2; newH += dy * 2; }
            if (this.resizeCorner === 'ne') { newW += dx * 2; newH -= dy * 2; }
            if (this.resizeCorner === 'nw') { newW -= dx * 2; newH -= dy * 2; }

            if (node.isStickyNote) {
                node.width = Math.max(minW, newW);
                node.height = Math.max(minH, newH);
            } else {
                node.manualWidth = Math.max(minW, newW);
                node.manualHeight = Math.max(minH, newH);
            }
            this.onUpdate();
            return;
        }

        // Update hovered node
        const overNode = this.findNodeAt(worldPos);
        const newHoverId = overNode ? overNode.id : null;
        if (this.hoveredNodeId !== newHoverId) {
            this.hoveredNodeId = newHoverId;
            // Update all nodes' hover state
            Object.values(this.nodes).forEach(n => n.isHovered = (n.id === newHoverId));
            this.onUpdate();
        }

        if (this.state.isPanning) {
            const dx = rawPos.x - this.state.lastPanPos.x;
            const dy = rawPos.y - this.state.lastPanPos.y;
            this.state.panOffset.x += dx;
            this.state.panOffset.y += dy;
            this.state.lastPanPos = { ...rawPos };
            this.onUpdate();
            return;
        }

        if (this.mode === 'DRAG' && this.draggedNodeId) {
            const node = this.nodes[this.draggedNodeId];
            const dx = worldPos.x - node.x;
            const dy = worldPos.y - node.y;

            node.x = worldPos.x;
            node.y = worldPos.y;

            // --- DROP DETECTION ---
            if (!node.isRepoContainer) {
                const target = this.findNodeAt(worldPos, this.draggedNodeId);
                this.dropTargetId = (target && target.isRepoContainer) ? target.id : null;
                // Sync state for rendering
                Object.values(this.nodes).forEach(n => n.isDropTarget = (n.id === this.dropTargetId));
            }

            // Group Dragging: Move children with parent
            if (node.isRepoContainer) {
                Object.values(this.nodes).forEach(child => {
                    if (child.parentId === node.id) {
                        child.x += dx;
                        child.y += dy;
                    }
                });
            }

            this.onUpdate();
        } else if (this.mode === 'DRAW' && this.activeConnection) {
            this.activeConnection.currentPos = worldPos;
            this.onUpdate();
        }
    },

    handleMouseUp() {
        if (this.state.isPanning) {
            this.state.isPanning = false;
        }

        // Clear resize state
        if (this.resizingNodeId) {
            this.resizingNodeId = null;
            this.resizeCorner = null;
            this.resizeStartWorld = null;
            this.resizeStartSize = null;
            this.canvas.style.cursor = 'default';
            this.onUpdate();
            return;
        }

        if (this.mode === 'DRAG' && this.draggedNodeId) {
            const node = this.nodes[this.draggedNodeId];

            // Finalize Drop Parenting (drop INTO a container)
            if (this.dropTargetId && this.onNodeDrop) {
                this.onNodeDrop(this.draggedNodeId, this.dropTargetId);
            }
            // Unparent Detection (drag OUT of a container)
            else if (node.parentId && !this.dropTargetId) {
                const parent = this.nodes[node.parentId];
                if (parent) {
                    const bounds = DesignerCanvas.getContainerBounds(parent, this.nodes);
                    const isInside = node.x >= parent.x - bounds.w / 2 && node.x <= parent.x + bounds.w / 2 &&
                        node.y >= parent.y - bounds.h / 2 && node.y <= parent.y + bounds.h / 2;
                    if (!isInside) {
                        console.log(`[DesignerInteraction] Unparented ${node.id} from ${node.parentId}`);
                        node.parentId = null;
                    }
                }
            }

            node.isDragging = false;
            this.draggedNodeId = null;
            this.dropTargetId = null;
            Object.values(this.nodes).forEach(n => n.isDropTarget = false);
        } else if (this.mode === 'DRAW' && this.activeConnection) {
            const worldPos = this.activeConnection.currentPos;
            const endNode = this.findNodeAt(worldPos);

            // Drag-Drop completion: only if the mouse moved away from start node
            if (endNode && endNode.id !== this.activeConnection.fromNode.id) {
                this.finishConnection(endNode);
            }
            // We DON'T null activeConnection here to allow click-click style, 
            // unless we actually finished it.
        }

        this.onUpdate();
    },

    finishConnection(endNode) {
        if (!this.activeConnection) return;
        if (this.onConnection) {
            this.onConnection(this.activeConnection.fromNode.id, endNode.id);
        }
        this.activeConnection = null;
    },

    handleWheel(e) {
        e.preventDefault();

        if (this.panAnimation) {
            cancelAnimationFrame(this.panAnimation);
            this.panAnimation = null;
        }

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = this.state.zoomScale * delta;
        if (nextZoom >= this.state.minZoom && nextZoom <= this.state.maxZoom) {
            this.state.zoomScale = nextZoom;

            // Update zoom indicator
            const indicator = document.getElementById('zoom-value');
            if (indicator) {
                indicator.textContent = `${Math.round(nextZoom * 100)}%`;
            }

            this.onUpdate();
        }
    }
};
