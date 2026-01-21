/**
 * ResizeHandler.js
 * Responsabilidad: Gestión del redimensionamiento de contenedores y notas adhesivas
 */

export const ResizeHandler = {
    state: {
        resizingNodeId: null,
        resizeCorner: null,
        resizeStartSize: null,
        resizeChildPositions: {}  // Relative positions of children at resize start
    },

    /**
     * Initialize with nodes reference
     */
    init(nodes) {
        this.nodes = nodes;
    },

    /**
     * Start resizing a node
     */
    startResize(nodeId, corner, mousePos) {
        const node = this.nodes[nodeId];
        if (!node) return;

        this.state.resizingNodeId = nodeId;
        this.state.resizeCorner = corner;
        this.state.resizeStartMouse = { ...mousePos }; // Store initial mouse position
        this.state.resizeStartSize = {
            w: node.manualWidth || node.width || 180,
            h: node.manualHeight || node.height || 100
        };

        // Store relative positions of children for proportional scaling
        if (node.isRepoContainer) {
            this.captureChildPositions(node);
        }
    },

    /**
     * Update resize operation
     */
    updateResize(mousePos, onUpdate) {
        if (!this.state.resizingNodeId || !this.state.resizeStartMouse) return;

        const node = this.nodes[this.state.resizingNodeId];
        if (!node) return;

        // Calculate delta from initial mouse position
        const dx = mousePos.x - this.state.resizeStartMouse.x;
        const dy = mousePos.y - this.state.resizeStartMouse.y;

        let newW = this.state.resizeStartSize.w;
        let newH = this.state.resizeStartSize.h;
        const minW = node.isStickyNote ? 60 : 140;
        const minH = node.isStickyNote ? 40 : 100;

        // Apply delta based on corner (multiply by 2 because node is centered)
        switch (this.state.resizeCorner) {
            case 'se':
                newW += dx * 2;
                newH += dy * 2;
                break;
            case 'sw':
                newW -= dx * 2;
                newH += dy * 2;
                break;
            case 'ne':
                newW += dx * 2;
                newH -= dy * 2;
                break;
            case 'nw':
                newW -= dx * 2;
                newH -= dy * 2;
                break;
        }

        // Apply limits
        newW = Math.max(minW, newW);
        newH = Math.max(minH, newH);

        if (node.isStickyNote) {
            node.width = newW;
            node.height = newH;
        } else {
            node.manualWidth = newW;
            node.manualHeight = newH;
        }

        // Handle proportional scaling for containers
        if (node.isRepoContainer && this.state.resizeChildPositions) {
            this.scaleChildrenProportionally(node, newW, newH);
        }

        if (onUpdate) onUpdate();
    },

    /**
     * End resize operation
     */
    endResize() {
        if (!this.state.resizingNodeId) return;

        this.clearResizeState();
    },

    /**
     * Capture relative positions of children at resize start
     */
    captureChildPositions(containerNode) {
        this.state.resizeChildPositions = {};

        Object.values(this.nodes).forEach(child => {
            if (child.parentId === containerNode.id) {
                this.state.resizeChildPositions[child.id] = {
                    relX: child.x - containerNode.x,
                    relY: child.y - containerNode.y
                };
            }
        });
    },

    /**
     * Scale children proportionally during resize
     */
    scaleChildrenProportionally(containerNode, newWidth, newHeight) {
        const startWidth = this.state.resizeStartSize.w;
        const startHeight = this.state.resizeStartSize.h;
        const margin = 40;

        // Calculate scale factors
        const scaleX = (newWidth - margin * 2) / Math.max(startWidth - margin * 2, 1);
        const scaleY = (newHeight - margin * 2) / Math.max(startHeight - margin * 2, 1);

        const bounds = {
            minX: containerNode.x - newWidth / 2 + margin,
            minY: containerNode.y - newHeight / 2 + margin,
            maxX: containerNode.x + newWidth / 2 - margin,
            maxY: containerNode.y + newHeight / 2 - margin
        };

        // Scale and clamp children
        Object.values(this.nodes).forEach(child => {
            if (child.parentId === containerNode.id && this.state.resizeChildPositions[child.id]) {
                const startRel = this.state.resizeChildPositions[child.id];

                // Apply proportional scaling
                const newRelX = startRel.relX * scaleX;
                const newRelY = startRel.relY * scaleY;

                child.x = containerNode.x + newRelX;
                child.y = containerNode.y + newRelY;

                // Clamp to bounds
                child.x = Math.max(bounds.minX, Math.min(bounds.maxX, child.x));
                child.y = Math.max(bounds.minY, Math.min(bounds.maxY, child.y));
            }
        });
    },

    /**
     * Check if mouse is over a resize handle
     */
    findResizeHandle(worldPos) {
        const handleSize = 12;

        for (const node of Object.values(this.nodes).slice().reverse()) {
            if (!node.isRepoContainer && !node.isStickyNote) continue;

            let w, h;
            if (node.isRepoContainer) {
                w = (node.manualWidth || node.width || 180);
                h = (node.manualHeight || node.height || 100);
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
                if (Math.abs(worldPos.x - pos.x) < handleSize &&
                    Math.abs(worldPos.y - pos.y) < handleSize) {
                    return { nodeId: node.id, corner, w, h };
                }
            }
        }

        return null;
    },

    /**
     * Get appropriate cursor for resize handle
     */
    getResizeCursor(corner) {
        const cursors = {
            'nw': 'nw-resize',
            'ne': 'ne-resize',
            'sw': 'sw-resize',
            'se': 'se-resize'
        };
        return cursors[corner] || 'default';
    },

    /**
     * Check if currently resizing
     */
    isResizing() {
        return this.state.resizingNodeId !== null;
    },

    /**
     * Cancel current resize
     */
    cancelResize() {
        this.clearResizeState();
    },

    /**
     * Clear resize state
     */
    clearResizeState() {
        this.state.resizingNodeId = null;
        this.state.resizeCorner = null;
        this.state.resizeStartMouse = null;
        this.state.resizeStartSize = null;
        this.state.resizeChildPositions = {};
    }
};
