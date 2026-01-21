/**
 * DragHandler.js
 * Responsabilidad: Gestión del arrastre de nodos y detección de drop targets
 */

export const DragHandler = {
    state: {
        draggingNodeId: null,
        dragStart: null,
        dragOffset: null,
        dropTargetId: null
    },

    /**
     * Initialize with nodes reference
     */
    init(nodes) {
        this.nodes = nodes;
    },

    /**
     * Start dragging a node
     */
    startDrag(nodeId, mousePos) {
        const node = this.nodes[nodeId];
        if (!node) return;

        this.state.draggingNodeId = nodeId;
        this.state.dragStart = { ...mousePos };
        this.state.dragOffset = {
            x: mousePos.x - node.x,
            y: mousePos.y - node.y
        };

        node.isDragging = true;
        this.clearDropTarget();
    },

    /**
     * Update drag position
     */
    updateDrag(mousePos, nodes) {
        if (!this.state.draggingNodeId) return;

        const node = this.nodes[this.state.draggingNodeId];
        if (!node) return;

        // Update node position
        node.x = mousePos.x - this.state.dragOffset.x;
        node.y = mousePos.y - this.state.dragOffset.y;

        // Handle group dragging (containers drag their children)
        if (node.isRepoContainer) {
            this.updateChildPositions(node, mousePos);
        }

        // Update drop target detection
        this.updateDropTarget(mousePos, nodes);
    },

    /**
     * End dragging
     */
    endDrag(onNodeDrop) {
        if (!this.state.draggingNodeId) return;

        const node = this.nodes[this.state.draggingNodeId];
        if (!node) return;

        node.isDragging = false;

        // Handle drop into container
        if (this.state.dropTargetId && onNodeDrop) {
            onNodeDrop(this.state.draggingNodeId, this.state.dropTargetId);
        }
        // Handle unparenting (drag out of container)
        else if (node.parentId) {
            this.handleUnparenting(node);
        }

        this.clearDragState();
    },

    /**
     * Update positions of child nodes when dragging a container
     */
    updateChildPositions(containerNode, mousePos) {
        const dx = mousePos.x - this.state.dragStart.x;
        const dy = mousePos.y - this.state.dragStart.y;

        Object.values(this.nodes).forEach(child => {
            if (child.parentId === containerNode.id) {
                // Store original position on first drag
                if (!child._originalPos) {
                    child._originalPos = { x: child.x, y: child.y };
                }

                // Move child relative to container movement
                child.x = child._originalPos.x + dx;
                child.y = child._originalPos.y + dy;
            }
        });
    },

    /**
     * Update drop target detection
     */
    updateDropTarget(mousePos, nodes) {
        const draggingNode = this.nodes[this.state.draggingNodeId];
        if (!draggingNode || draggingNode.isRepoContainer) {
            this.clearDropTarget();
            return;
        }

        // Find potential drop target (container under mouse)
        const target = this.findDropTarget(mousePos, nodes);
        const newDropTargetId = target ? target.id : null;

        if (this.state.dropTargetId !== newDropTargetId) {
            // Clear previous drop target
            if (this.state.dropTargetId) {
                const prevTarget = this.nodes[this.state.dropTargetId];
                if (prevTarget) prevTarget.isDropTarget = false;
            }

            // Set new drop target
            this.state.dropTargetId = newDropTargetId;
            if (newDropTargetId) {
                target.isDropTarget = true;
            }
        }
    },

    /**
     * Find container at position that can accept drops
     */
    findDropTarget(worldPos, nodes) {
        for (const node of Object.values(nodes).slice().reverse()) {
            if (!node.isRepoContainer) continue;

            const bounds = this.getContainerBounds(node);
            if (worldPos.x >= bounds.minX && worldPos.x <= bounds.maxX &&
                worldPos.y >= bounds.minY && worldPos.y <= bounds.maxY) {
                return node;
            }
        }
        return null;
    },

    /**
     * Get container bounds for drop detection
     */
    getContainerBounds(container) {
        const w = (container.manualWidth || container.width || 180) / 2;
        const h = (container.manualHeight || container.height || 100) / 2;
        return {
            minX: container.x - w,
            maxX: container.x + w,
            minY: container.y - h,
            maxY: container.y + h
        };
    },

    /**
     * Handle unparenting when dragging node out of container
     */
    handleUnparenting(node) {
        const parent = this.nodes[node.parentId];
        if (!parent) return;

        const bounds = this.getContainerBounds(parent);
        const isInside = node.x >= bounds.minX && node.x <= bounds.maxX &&
            node.y >= bounds.minY && node.y <= bounds.maxY;

        if (!isInside) {
            console.log(`[DragHandler] Unparented ${node.id} from ${node.parentId}`);
            node.parentId = null;
        }
    },

    /**
     * Clear drop target state
     */
    clearDropTarget() {
        if (this.state.dropTargetId) {
            const target = this.nodes[this.state.dropTargetId];
            if (target) target.isDropTarget = false;
        }
        this.state.dropTargetId = null;
    },

    /**
     * Clear all drag state
     */
    clearDragState() {
        if (this.state.draggingNodeId) {
            const node = this.nodes[this.state.draggingNodeId];
            if (node) {
                node.isDragging = false;
                // Clean up temporary drag data
                Object.values(this.nodes).forEach(child => {
                    if (child._originalPos) {
                        delete child._originalPos;
                    }
                });
            }
        }

        this.state.draggingNodeId = null;
        this.state.dragStart = null;
        this.state.dragOffset = null;
        this.clearDropTarget();
    },

    /**
     * Check if currently dragging
     */
    isDragging() {
        return this.state.draggingNodeId !== null;
    },

    /**
     * Cancel current drag operation
     */
    cancelDrag() {
        this.clearDragState();
    }
};
