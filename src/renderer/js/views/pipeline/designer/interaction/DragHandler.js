/**
 * DragHandler.js
 * Responsabilidad: Gestión del arrastre de nodos y detección de drop targets
 */

import { DesignerCanvas } from '../DesignerCanvas.js';

export const DragHandler = {
    state: {
        draggingNodeId: null,
        dragStart: null,
        dragOffset: null,
        dropTargetId: null
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
            this.nodes = null; // Clear static ref
        } else {
            this.nodes = nodeProvider; // Legacy support
        }
    },

    getNodes() {
        return this.nodeProvider ? this.nodeProvider() : this.nodes;
    },

    /**
     * Start dragging a node
     */
    startDrag(nodeId, mousePos) {
        const nodes = this.getNodes();
        const node = nodes[nodeId];
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
    updateDrag(mousePos, nodesArg) {
        // nodesArg is ignored in favor of fresh state from provider if available
        const nodes = this.getNodes();
        if (!this.state.draggingNodeId) return;

        const node = nodes[this.state.draggingNodeId];
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
        const nodes = this.getNodes();
        if (!this.state.draggingNodeId) return;

        const node = nodes[this.state.draggingNodeId];
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
        const nodes = this.getNodes();
        const dx = mousePos.x - this.state.dragStart.x;
        const dy = mousePos.y - this.state.dragStart.y;

        Object.values(nodes).forEach(child => {
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
    updateDropTarget(mousePos, nodesArg) {
        const nodes = this.getNodes();
        const draggingNode = nodes[this.state.draggingNodeId];
        if (!draggingNode || draggingNode.isRepoContainer) {
            this.clearDropTarget();
            return;
        }

        // Find potential drop target (container under mouse)
        const target = this.findDropTarget(mousePos, nodes);
        this.state.dropTargetId = target ? target.id : null;
    },

    /**
     * Find container at position that can accept drops
     */
    findDropTarget(worldPos, nodes) {
        // Higher nodes (last in list) take precedence
        const nodeList = Object.values(nodes);
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (!node.isRepoContainer) continue;
            if (node.id === this.state.draggingNodeId) continue; // Don't drop into yourself

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
        const nodes = this.getNodes();
        // Use unified logic from DesignerCanvas (non-mutating for hit testing)
        const bounds = DesignerCanvas.getContainerBounds(container, nodes);
        const w = bounds.w;
        const h = bounds.h;
        return {
            minX: (bounds.centerX || container.x) - w / 2,
            maxX: (bounds.centerX || container.x) + w / 2,
            minY: (bounds.centerY || container.y) - h / 2,
            maxY: (bounds.centerY || container.y) + h / 2
        };
    },

    /**
     * Handle unparenting when dragging node out of container
     */
    handleUnparenting(node) {
        const nodes = this.getNodes();
        const parentId = node.parentId;
        if (!parentId) return;

        const parent = nodes[parentId];
        if (!parent) return;

        const bounds = this.getContainerBounds(parent);

        // Add a small buffer (margin) to make it easier to stay inside
        const margin = 20;
        const isInside = node.x >= bounds.minX - margin && node.x <= bounds.maxX + margin &&
            node.y >= bounds.minY - margin && node.y <= bounds.maxY + margin;

        if (!isInside) {
            console.log(`[DragHandler] Unparented ${node.id} from ${parentId}`);
            node.parentId = null;
        }
    },

    /**
     * Clear drop target state
     */
    clearDropTarget() {
        this.state.dropTargetId = null;
    },

    /**
     * Clear all drag state
     */
    clearDragState() {
        const nodes = this.getNodes();
        if (this.state.draggingNodeId && nodes) {
            const node = nodes[this.state.draggingNodeId];
            if (node) {
                node.isDragging = false;
                // Clean up temporary drag data
                Object.values(nodes).forEach(child => {
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
