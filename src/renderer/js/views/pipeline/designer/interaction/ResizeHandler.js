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
     * @type {() => Object}
     */
    nodeProvider: null,

    /**
     * Initialize with nodes reference or provider
     */
    init(nodeProvider) {
        if (typeof nodeProvider === 'function') {
            this.nodeProvider = nodeProvider;
            this.nodes = null;
        } else {
            this.nodes = nodeProvider;
        }
    },

    getNodes() {
        return this.nodeProvider ? this.nodeProvider() : this.nodes;
    },

    /**
     * Start resizing a node
     */
    startResize(nodeId, corner, mousePos) {
        const nodes = this.getNodes();
        const node = nodes[nodeId];
        if (!node || !node.dimensions) return;

        this.state.resizingNodeId = nodeId;
        this.state.resizeCorner = corner;
        this.state.resizeStartMouse = { ...mousePos };
        this.state.resizeStartSize = {
            w: node.dimensions.w,
            h: node.dimensions.h
        };

        if (node.isRepoContainer) {
            this.captureChildPositions(node);
        }
    },

    /**
     * Update resize operation
     */
    updateResize(mousePos, onUpdate) {
        if (!this.state.resizingNodeId || !this.state.resizeStartMouse) return;

        const nodes = this.getNodes();
        const node = nodes[this.state.resizingNodeId];
        if (!node || !node.dimensions) return;

        const dx = mousePos.x - this.state.resizeStartMouse.x;
        const dy = mousePos.y - this.state.resizeStartMouse.y;

        let newW = this.state.resizeStartSize.w;
        let newH = this.state.resizeStartSize.h;
        const minW = node.isStickyNote ? 180 : 140;
        const minH = node.isStickyNote ? 100 : 100;

        switch (this.state.resizeCorner) {
            case 'se': newW += dx * 2; newH += dy * 2; break;
            case 'sw': newW -= dx * 2; newH += dy * 2; break;
            case 'ne': newW += dx * 2; newH -= dy * 2; break;
            case 'nw': newW -= dx * 2; newH -= dy * 2; break;
        }

        newW = Math.max(minW, newW);
        newH = Math.max(minH, newH);

        // Update unified dimensions
        node.dimensions.w = newW;
        node.dimensions.h = newH;
        node.dimensions.isManual = true;

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
        const nodes = this.getNodes();
        this.state.resizeChildPositions = {};
        Object.values(nodes).forEach(child => {
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
        const nodes = this.getNodes();
        const startWidth = this.state.resizeStartSize.w;
        const startHeight = this.state.resizeStartSize.h;
        const margin = 40;

        const scaleX = (newWidth - margin * 2) / Math.max(startWidth - margin * 2, 1);
        const scaleY = (newHeight - margin * 2) / Math.max(startHeight - margin * 2, 1);

        const bounds = {
            minX: containerNode.x - newWidth / 2 + margin,
            minY: containerNode.y - newHeight / 2 + margin,
            maxX: containerNode.x + newWidth / 2 - margin,
            maxY: containerNode.y + newHeight / 2 - margin
        };

        Object.values(nodes).forEach(child => {
            if (child.parentId === containerNode.id && this.state.resizeChildPositions[child.id]) {
                const startRel = this.state.resizeChildPositions[child.id];
                child.x = containerNode.x + startRel.relX * scaleX;
                child.y = containerNode.y + startRel.relY * scaleY;

                child.x = Math.max(bounds.minX, Math.min(bounds.maxX, child.x));
                child.y = Math.max(bounds.minY, Math.min(bounds.maxY, child.y));
            }
        });
    },

    /**
     * Check if mouse is over a resize handle
     */
    findResizeHandle(worldPos) {
        const nodes = this.getNodes();
        const handleSize = 30; // Generous hit area for UX

        for (const node of Object.values(nodes).slice().reverse()) {
            if (!node.isRepoContainer && !node.isStickyNote) continue;

            let w, h, centerX, centerY;

            if (node.isStickyNote) {
                // Sticky notes use static dimensions
                w = node.dimensions?.w || 180;
                h = node.dimensions?.h || 100;
                centerX = node.x;
                centerY = node.y;
            } else if (node.isRepoContainer) {
                // For containers, calculate bounds inline to avoid circular imports
                const dims = node.dimensions || {};

                if (dims.isManual && dims.w && dims.h) {
                    // Manual mode: use stored dimensions
                    w = dims.w;
                    h = dims.h;
                    centerX = node.x;
                    centerY = node.y;
                } else {
                    // Auto mode: calculate from children
                    const containerId = node.id;
                    const children = Object.values(nodes).filter(n => n.parentId === containerId);

                    if (children.length === 0) {
                        w = 140;
                        h = 100;
                        centerX = node.x;
                        centerY = node.y;
                    } else {
                        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                        children.forEach(c => {
                            const r = 35; // Default node radius
                            minX = Math.min(minX, c.x - r);
                            maxX = Math.max(maxX, c.x + r);
                            minY = Math.min(minY, c.y - r);
                            maxY = Math.max(maxY, c.y + r);
                        });
                        const padding = 60;
                        w = (maxX - minX) + padding;
                        h = (maxY - minY) + padding + 40;
                        centerX = (minX + maxX) / 2;
                        centerY = (minY + maxY) / 2;
                    }
                }
            }

            if (!w || !h) continue;

            const corners = {
                'nw': { x: centerX - w / 2, y: centerY - h / 2 },
                'ne': { x: centerX + w / 2, y: centerY - h / 2 },
                'sw': { x: centerX - w / 2, y: centerY + h / 2 },
                'se': { x: centerX + w / 2, y: centerY + h / 2 }
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

    getResizeCursor(corner) {
        const cursors = { 'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize' };
        return cursors[corner] || 'default';
    },

    isResizing() {
        return this.state.resizingNodeId !== null;
    },

    cancelResize() {
        this.clearResizeState();
    },

    clearResizeState() {
        this.state.resizingNodeId = null;
        this.state.resizeCorner = null;
        this.state.resizeStartMouse = null;
        this.state.resizeStartSize = null;
        this.state.resizeChildPositions = {};
    }
};
