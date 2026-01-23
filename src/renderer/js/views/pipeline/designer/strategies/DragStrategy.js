/**
 * DragStrategy.js
 * Strategy for dragging nodes and containers
 * Implements dragging logic extracted from DragHandler
 */

import { InteractionStrategy } from './InteractionStrategy.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DesignerStore } from '../modules/DesignerStore.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export class DragStrategy extends InteractionStrategy {
    constructor(controller) {
        super(controller);
        this.dragState = {
            draggingNodeId: null,
            dragStart: null,
            dragOffset: { x: 0, y: 0 },
            dropTargetId: null
        };
    }

    /**
     * Handle mouse down for drag initiation
     * @param {MouseEvent} e - Mouse event
     * @param {Object} context - Context with clicked node info
     */
    handleMouseDown(e, context = {}) {
        const worldPos = this.controller.getWorldPosFromEvent(e);

        // ONLY concern: Start dragging the clicked node
        if (e.button === 0) {
            const clickedNodeId = this.controller.hoveredNodeId;
            const clickedNode = clickedNodeId ? this.controller.nodes[clickedNodeId] : null;

            if (clickedNode) {
                this.startDrag(clickedNode, worldPos);
                this.controller.onUpdate?.();
            }
        }
    }

    /**
     * Handle mouse move for drag updates
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!this.isActive()) return;

        const worldPos = this.controller.getWorldPosFromEvent(e);
        this.updateDrag(worldPos);
        this.controller.onUpdate?.();
    }

    /**
     * Handle mouse up for drag completion
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        if (this.isActive()) {
            this.endDrag();
            this.controller.onUpdate?.();
        }

        if (this.controller.onInteractionEnd) {
            this.controller.onInteractionEnd();
        }
    }

    /**
     * Handle key down for drag cancellation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.cancel();
            this.controller.onUpdate?.();
        }
    }

    /**
     * Get cursor style for drag strategy
     * @returns {string}
     */
    getCursor() {
        return 'default';
    }

    /**
     * Check if drag is active
     * @returns {boolean}
     */
    isActive() {
        return this.dragState.draggingNodeId !== null;
    }

    /**
     * Cancel current drag
     */
    cancel() {
        if (this.isActive()) {
            this.endDrag();
        }
        this.controller.panZoomHandler.cancel();
        this.controller.resizeHandler.cancel();
    }

    /**
     * Start dragging a node
     * @param {Object} node - Node to drag
     * @param {Object} worldPos - World position where drag started
     */
    startDrag(node, worldPos) {
        // UNIFIED HISTORY: Create savepoint BEFORE drag starts (makes it undoable)
        DesignerStore.savepoint('NODE_MOVE', { nodeId: node.id });

        this.dragState.draggingNodeId = node.id;
        this.dragState.dragStart = { ...worldPos };
        this.dragState.dragOffset = {
            x: worldPos.x - node.x,
            y: worldPos.y - node.y
        };
        this.dragState.dropTargetId = null;

        node.isDragging = true;

        console.log(`[DragStrategy] Started dragging: ${node.id}`);
    }

    /**
     * Update drag position
     * @param {Object} worldPos - Current world position
     */
    updateDrag(worldPos) {
        const nodes = this.controller.nodes;
        const node = nodes[this.dragState.draggingNodeId];

        if (!node) return;

        // Update node position
        node.x = worldPos.x - this.dragState.dragOffset.x;
        node.y = worldPos.y - this.dragState.dragOffset.y;

        // Handle group dragging for containers
        if (node.isRepoContainer) {
            this.updateChildPositions(node, worldPos);
        }

        // Update drop target detection
        this.updateDropTarget(worldPos, nodes);
    }

    /**
     * End dragging
     */
    endDrag() {
        const nodes = this.controller.nodes;
        const node = nodes[this.dragState.draggingNodeId];

        if (node) {
            node.isDragging = false;

            // Handle drop
            if (this.dragState.dropTargetId && this.controller.onNodeDrop) {
                this.controller.onNodeDrop(this.dragState.draggingNodeId, this.dragState.dropTargetId);
            }
            // Handle unparenting
            else if (node.parentId) {
                this.handleUnparenting(node);
            }
        }

        this.cleanupDragState(nodes);
    }

    /**
     * Update positions of child nodes when dragging a container
     * @param {Object} containerNode - Container being dragged
     * @param {Object} mousePos - Current mouse position
     */
    updateChildPositions(containerNode, mousePos) {
        const nodes = this.controller.nodes;
        const dx = mousePos.x - this.dragState.dragStart.x;
        const dy = mousePos.y - this.dragState.dragStart.y;

        Object.values(nodes).forEach(child => {
            if (child.parentId === containerNode.id) {
                if (!child._originalPos) {
                    child._originalPos = { x: child.x, y: child.y };
                }
                child.x = child._originalPos.x + dx;
                child.y = child._originalPos.y + dy;
            }
        });
    }

    /**
     * Update drop target detection
     * @param {Object} worldPos - Current world position
     * @param {Object} nodes - All nodes
     */
    updateDropTarget(worldPos, nodes) {
        const draggingNode = nodes[this.dragState.draggingNodeId];
        if (!draggingNode || draggingNode.isRepoContainer) {
            this.dragState.dropTargetId = null;
            return;
        }

        this.dragState.dropTargetId = this.findDropTarget(worldPos, nodes);
    }

    /**
     * Find valid drop target at position
     * @param {Object} worldPos - World position
     * @param {Object} nodes - All nodes
     * @returns {Object|null} Target node or null
     */
    findDropTarget(worldPos, nodes) {
        const draggingNode = nodes[this.dragState.draggingNodeId];
        const nodeList = Object.values(nodes);

        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (!node.isRepoContainer || node.id === draggingNode.id) continue;

            const bounds = GeometryUtils.getContainerBounds(node, nodes);
            const w = bounds.w;
            const h = bounds.h;

            // Hit test on bounds
            if (worldPos.x >= bounds.centerX - w / 2 &&
                worldPos.x <= bounds.centerX + w / 2 &&
                worldPos.y >= bounds.centerY - h / 2 &&
                worldPos.y <= bounds.centerY + h / 2) {
                return node.id; // Return ID, not object
            }
        }
        return null;
    }

    /**
     * Handle unparenting logic when node is dragged outside container
     * @param {Object} node - Node being dragged
     */
    handleUnparenting(node) {
        const nodes = this.controller.nodes;
        const parentId = node.parentId;
        if (!parentId) return;

        const parent = nodes[parentId];
        if (!parent) return;

        const bounds = GeometryUtils.getContainerBounds(parent, nodes);
        const margin = DESIGNER_CONSTANTS.INTERACTION.DRAG.UNPARENT_MARGIN;

        const isInside = node.x >= bounds.centerX - bounds.w / 2 - margin &&
            node.x <= bounds.centerX + bounds.w / 2 + margin &&
            node.y >= bounds.centerY - bounds.h / 2 - margin &&
            node.y <= bounds.centerY + bounds.h / 2 + margin;

        if (!isInside) {
            console.log(`[DragStrategy] Unparented ${node.id} from ${parentId}`);
            node.parentId = null;
        }
    }

    /**
     * Clean up drag state
     * @param {Object} nodes - All nodes
     */
    cleanupDragState(nodes) {
        if (nodes) {
            Object.values(nodes).forEach(child => {
                delete child._originalPos;
            });
        }

        this.dragState.draggingNodeId = null;
        this.dragState.dragStart = null;
        this.dragState.dragOffset = { x: 0, y: 0 };
        this.dragState.dropTargetId = null;
    }
}
