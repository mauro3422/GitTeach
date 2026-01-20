export const DesignerInteraction = {
    canvas: null,
    nodes: null,
    onUpdate: null,
    draggedNodeId: null,

    // NEW: Manual Connection state
    mode: 'DRAG', // 'DRAG' or 'DRAW'
    activeConnection: null, // { fromNode, currentPos }

    state: {
        panOffset: { x: 0, y: 0 },
        zoomScale: 1.0,
        isPanning: false,
        lastPanPos: { x: 0, y: 0 },
        minZoom: 0.2,
        maxZoom: 3.0
    },

    init(canvas, nodes, onUpdate) {
        this.canvas = canvas;
        this.nodes = nodes;
        this.onUpdate = onUpdate;

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    toggleMode() {
        this.mode = this.mode === 'DRAG' ? 'DRAW' : 'DRAG';
        return this.mode === 'DRAW';
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

    handleMouseDown(e) {
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
            const clickedNode = Object.values(this.nodes).reverse().find(node => {
                const dist = Math.sqrt((node.x - worldPos.x) ** 2 + (node.y - worldPos.y) ** 2);
                return dist < 40;
            });

            if (this.mode === 'DRAG' && clickedNode) {
                this.draggedNodeId = clickedNode.id;
                clickedNode.isDragging = true;
            } else if (this.mode === 'DRAW' && clickedNode) {
                // Start a manual connection
                this.activeConnection = { fromNode: clickedNode, currentPos: worldPos };
            }
            this.onUpdate();
        }
    },

    handleMouseMove(e) {
        const rawPos = this.getMousePos(e);
        const worldPos = this.screenToWorld(rawPos);

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
            node.x = worldPos.x;
            node.y = worldPos.y;
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

        if (this.mode === 'DRAG' && this.draggedNodeId) {
            this.nodes[this.draggedNodeId].isDragging = false;
            this.draggedNodeId = null;
        } else if (this.mode === 'DRAW' && this.activeConnection) {
            const worldPos = this.activeConnection.currentPos;
            const endNode = Object.values(this.nodes).reverse().find(node => {
                const dist = Math.sqrt((node.x - worldPos.x) ** 2 + (node.y - worldPos.y) ** 2);
                return dist < 40;
            });

            if (endNode && endNode.id !== this.activeConnection.fromNode.id) {
                // Signal completion to the orchestrator
                import('./RoutingDesigner.js').then(m => {
                    m.RoutingDesigner.addManualConnection(this.activeConnection.fromNode.id, endNode.id);
                });
            }
            this.activeConnection = null;
        }

        this.onUpdate();
    },

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = this.state.zoomScale * delta;
        if (nextZoom >= this.state.minZoom && nextZoom <= this.state.maxZoom) {
            this.state.zoomScale = nextZoom;
            this.onUpdate();
        }
    }
};
