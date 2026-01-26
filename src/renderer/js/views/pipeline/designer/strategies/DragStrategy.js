/**
 * DragStrategy.js
 * Strategy for dragging nodes and containers
 * Implements dragging logic extracted from DragHandler
 */

import { InteractionStrategy } from './InteractionStrategy.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { nodeRepository } from '../modules/stores/NodeRepository.js';
import { interactionState } from '../modules/stores/InteractionState.js';
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

        // ROBUST PATTERN: Start dragging the SELECTED node (not hovered)
        // Selection is already handled by DesignerInteraction.handleMouseDown
        if (e.button === 0) {
            const selectedNodeId = interactionState.state.selectedNodeId;
            const selectedNode = selectedNodeId ? this.controller.nodes[selectedNodeId] : null;

            if (selectedNode) {
                this.startDrag(selectedNode, worldPos);
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

        // Sync initial isDragging state with specialized record store
        node.isDragging = true;
        const updatedNodes = { ...this.controller.nodes };
        updatedNodes[node.id] = { ...node, isDragging: true };
        nodeRepository.setNodes(updatedNodes);
        interactionState.setDragging(node.id);

        console.log(`[DragStrategy] Started dragging: ${node.id}`);
    }

    /**
     * Update drag position
     * CRITICAL FIX: Now syncs to Store each frame (like ResizeHandler does)
     * This prevents state divergence and lag
     * @param {Object} worldPos - Current world position
     */
    updateDrag(worldPos) {
        const nodes = this.controller.nodes;
        const node = nodes[this.dragState.draggingNodeId];

        if (!node) return;

        // Calculate new position
        const newX = worldPos.x - this.dragState.dragOffset.x;
        const newY = worldPos.y - this.dragState.dragOffset.y;

        // Build updated nodes object with new position (SSOT pattern)
        const updatedNodes = { ...nodes };
        updatedNodes[node.id] = {
            ...node,
            x: newX,
            y: newY,
            isDragging: true
        };

        // Handle group dragging for containers
        if (node.isRepoContainer) {
            this.updateChildPositionsInObject(updatedNodes, node, worldPos);
        }

        // CRITICAL: Sync to Record Store every frame (eliminates lag and state divergence)
        // This matches the pattern used by ResizeHandler for consistency
        nodeRepository.setNodes(updatedNodes);

        // Update drop target detection
        this.updateDropTarget(worldPos, updatedNodes);
    }

    /**
     * End dragging
     */
    endDrag() {
        const nodes = this.controller.nodes;
        const node = nodes[this.dragState.draggingNodeId];
        const nodeId = this.dragState.draggingNodeId;

        if (node) {
            node.isDragging = false;

            // Handle drop
            if (this.dragState.dropTargetId && this.controller.onNodeDrop) {
                this.controller.onNodeDrop(nodeId, this.dragState.dropTargetId);
            }
            // Handle unparenting
            else if (node.parentId) {
                this.handleUnparenting(node);
            }

            // CRITICAL: Always sync final node state with Record Store to ensure isDragging is cleared
            // This prevents stale references where isDragging=true but Store has different state
            const finalNodes = { ...nodes };
            finalNodes[nodeId] = { ...nodes[nodeId], isDragging: false };
            nodeRepository.setNodes(finalNodes);
        }

        interactionState.setDragging(null);
        this.cleanupDragState(nodes);
    }

    /**
     * Update positions of child nodes when dragging a container (DEPRECATED)
     * Use updateChildPositionsInObject instead for immutable updates
     * @deprecated
     */
    updateChildPositions(containerNode, mousePos) {
        // This method is now deprecated in favor of immutable updates
        // Kept for compatibility but not called from updateDrag
    }

    /**
     * Update positions of child nodes immutably (new SSOT-compliant version)
     * @param {Object} updatedNodes - Nodes object being built
     * @param {Object} containerNode - Container being dragged
     * @param {Object} mousePos - Current mouse position
     */
    updateChildPositionsInObject(updatedNodes, containerNode, mousePos) {
        const dx = mousePos.x - this.dragState.dragStart.x;
        const dy = mousePos.y - this.dragState.dragStart.y;

        // Find and update all children in the container
        Object.entries(this.controller.nodes).forEach(([childId, child]) => {
            if (child.parentId === containerNode.id) {
                // Get original position from controller.nodes (source of truth)
                const originalChild = this.controller.nodes[childId];
                const originalPos = originalChild._originalPos || { x: originalChild.x, y: originalChild.y };

                // Create new immutable child object
                updatedNodes[childId] = {
                    ...child,
                    x: originalPos.x + dx,
                    y: originalPos.y + dy,
                    _originalPos: originalPos
                };
            }
        });
    }

    /**
     * Update drop target detection
     * Now uses SSOT nodes passed in (prevents stale state)
     * @param {Object} worldPos - Current world position
     * @param {Object} nodes - All nodes (must be current SSOT)
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
     * CRITICAL: Use LOGICAL dimensions (w/h), not visual (renderW/renderH)
     * Node positions are logical, so bounds comparison must be logical too
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

        // CRITICAL: Use logical dimensions (bounds.w/h), not visual (bounds.renderW/renderH)
        // Node coordinates are logical, must compare with logical bounds
        const logicalW = bounds.w || bounds.renderW || 100;
        const logicalH = bounds.h || bounds.renderH || 100;

        const isInside = node.x >= bounds.centerX - logicalW / 2 - margin &&
            node.x <= bounds.centerX + logicalW / 2 + margin &&
            node.y >= bounds.centerY - logicalH / 2 - margin &&
            node.y <= bounds.centerY + logicalH / 2 + margin;

        if (!isInside) {
            console.log(`[DragStrategy] Unparented ${node.id} from ${parentId}`);
            node.parentId = null;
        }
    }

    /**
     * Clean up drag state
     * CRITICAL FIX: Always clears _originalPos from ALL nodes, clears isDragging flag
     * This prevents persistent state that hijacks subsequent drags
     * @param {Object} nodes - All nodes
     */
    cleanupDragState(nodes) {
        if (nodes) {
            // Clean up temporary position markers and ensure isDragging is false for all
            const cleanedNodes = { ...nodes };
            let needsUpdate = false;

            // CRITICAL: Check ALL nodes for cleanup, not just those with _originalPos
            Object.keys(nodes).forEach(nodeId => {
                const node = nodes[nodeId];
                // Check if node has _originalPos OR isDragging flag
                if (node._originalPos || node.isDragging) {
                    cleanedNodes[nodeId] = { ...node };
                    delete cleanedNodes[nodeId]._originalPos;
                    cleanedNodes[nodeId].isDragging = false;
                    needsUpdate = true;
                }
            });

            // CRITICAL FIX: ALWAYS sync to Store, even if no changes detected
            // This ensures _originalPos is removed from Store and won't persist
            // Unconditional update prevents state divergence
            nodeRepository.setNodes(cleanedNodes);

            // CRITICAL FIX: Invalidate bounds cache after drag
            // Prevents hit detection from using stale bounds with old _originalPos
            nodeRepository.clearBoundsCache();
        }

        this.dragState.draggingNodeId = null;
        this.dragState.dragStart = null;
        this.dragState.dragOffset = { x: 0, y: 0 };
        this.dragState.dropTargetId = null;

        // This also clears selectedNodeId now (from our DesignerStore fix)
        interactionState.setDragging(null);
    }
}
