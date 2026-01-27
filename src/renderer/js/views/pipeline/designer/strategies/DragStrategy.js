/**
 * DragStrategy.js
 * Strategy for dragging nodes and containers
 * Implements dragging logic extracted from DragHandler
 */

import { InteractionStrategy } from './InteractionStrategy.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export class DragStrategy extends InteractionStrategy {
    constructor(dependencies) {
        super(dependencies);
        this.dragState = {
            draggingNodeId: null,
            dragStart: null,
            dragOffset: { x: 0, y: 0 },
            dropTargetId: null
        };
    }

    /**
     * Handle mouse down for drag initiation
     */
    handleMouseDown(e, context = {}) {
        const worldPos = this.controller.getWorldPosFromEvent(e);

        if (e.button === 0) {
            const selectedNodeId = this.interactionState.state.selectedNodeId;
            const selectedNode = selectedNodeId ? this.controller.nodes[selectedNodeId] : null;

            if (selectedNode) {
                this.startDrag(selectedNode, worldPos);
                this.controller.onUpdate?.();
            }
        }
    }

    /**
     * Handle mouse move for drag updates
     */
    handleMouseMove(e) {
        if (!this.isActive()) return;

        const worldPos = this.controller.getWorldPosFromEvent(e);
        this.updateDrag(worldPos);
        this.controller.onUpdate?.();
    }

    /**
     * Handle mouse up for drag completion
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
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.cancel();
            this.controller.onUpdate?.();
        }
    }

    getCursor() {
        return 'default';
    }

    isActive() {
        return this.dragState.draggingNodeId !== null;
    }

    cancel() {
        if (this.isActive()) {
            this.endDrag();
        }
        this.controller.panZoomHandler.cancel();
        this.controller.resizeHandler.cancel();
    }

    /**
     * Start dragging a node
     */
    startDrag(node, worldPos) {
        if (this.controller.saveToHistory) {
            this.controller.saveToHistory();
        }

        this.dragState.draggingNodeId = node.id;
        this.dragState.dragStart = { ...worldPos };
        this.dragState.dragOffset = {
            x: worldPos.x - node.x,
            y: worldPos.y - node.y
        };
        this.dragState.dropTargetId = null;

        // Commit dragging state
        this.nodeRepository.updateNode(node.id, { isDragging: true });
        this.interactionState.setDragging(node.id);
    }

    /**
     * Update drag position
     */
    updateDrag(worldPos) {
        const nodes = this.controller.nodes;
        const node = nodes[this.dragState.draggingNodeId];

        if (!node) return;

        const newX = worldPos.x - this.dragState.dragOffset.x;
        const newY = worldPos.y - this.dragState.dragOffset.y;

        const updatedNodes = { ...nodes };
        updatedNodes[node.id] = {
            ...node,
            x: newX,
            y: newY,
            isDragging: true
        };

        if (node.isRepoContainer) {
            this.updateChildPositionsInObject(updatedNodes, node, worldPos);
        }

        this.nodeRepository.setNodes(updatedNodes);
        this.updateDropTarget(worldPos, updatedNodes);
    }

    /**
     * End dragging with robust state sync
     */
    endDrag() {
        try {
            const nodeId = this.dragState.draggingNodeId;
            if (!nodeId) return;

            const nodes = this.controller.nodes;
            const node = nodes[nodeId];

            if (node) {
                // 1. Commit coordinates and clear isDragging flag
                this.nodeRepository.updateNode(nodeId, { isDragging: false });

                // 2. Refresh reference to ensure we have latest SSOT
                const latestNode = this.nodeRepository.getNode(nodeId);

                // 3. Parenting Logic
                if (this.dragState.dropTargetId && this.controller.onNodeDrop) {
                    this.controller.onNodeDrop(nodeId, this.dragState.dropTargetId);
                }
                else if (latestNode.parentId) {
                    this.handleUnparenting(latestNode);
                }
            }
        } catch (err) {
            console.error('[DragStrategy] Error ending drag:', err);
        } finally {
            this.cleanupDragState(this.controller.nodes);
        }
    }

    /**
     * Update positions of child nodes immutably
     */
    updateChildPositionsInObject(updatedNodes, containerNode, mousePos) {
        const dx = mousePos.x - this.dragState.dragStart.x;
        const dy = mousePos.y - this.dragState.dragStart.y;

        Object.entries(this.controller.nodes).forEach(([childId, child]) => {
            if (child.parentId === containerNode.id) {
                const originalChild = this.controller.nodes[childId];
                const originalPos = originalChild._originalPos || { x: originalChild.x, y: originalChild.y };

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
     */
    findDropTarget(worldPos, nodes) {
        const draggingNode = nodes[this.dragState.draggingNodeId];
        const nodeList = Object.values(nodes);

        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (!node.isRepoContainer || node.id === draggingNode.id) continue;

            // Exclude dragging node from bounds calculation
            const bounds = GeometryUtils.getContainerBounds(node, nodes, 1.0, null, draggingNode.id);
            const w = bounds.w;
            const h = bounds.h;

            const isHit = worldPos.x >= bounds.centerX - w / 2 &&
                worldPos.x <= bounds.centerX + w / 2 &&
                worldPos.y >= bounds.centerY - h / 2 &&
                worldPos.y <= bounds.centerY + h / 2;

            if (isHit) {
                return node.id;
            }
        }
        return null;
    }

    /**
     * Handle unparenting logic when node is dragged outside container
     */
    handleUnparenting(node) {
        const nodes = this.controller.nodes;
        const parentId = node.parentId;
        if (!parentId) return;

        const parent = nodes[parentId];
        if (!parent) return;

        const bounds = GeometryUtils.getContainerBounds(parent, nodes, 1.0, null, node.id);
        const margin = DESIGNER_CONSTANTS.INTERACTION.DRAG.UNPARENT_MARGIN;

        const logicalW = bounds.w;
        const logicalH = bounds.h;

        const isInside = node.x >= bounds.centerX - logicalW / 2 - margin &&
            node.x <= bounds.centerX + logicalW / 2 + margin &&
            node.y >= bounds.centerY - logicalH / 2 - margin &&
            node.y <= bounds.centerY + logicalH / 2 + margin;

        if (!isInside) {
            this.nodeRepository.updateNode(node.id, { parentId: null });
        }
    }

    /**
     * Clean up drag state and flags
     */
    cleanupDragState(nodes) {
        this.interactionState.setDragging(null);
        this.dragState.dropTargetId = null;
        this.dragState.draggingNodeId = null;
        this.nodeRepository.clearBoundsCache();

        if (nodes) {
            Object.values(nodes).forEach(node => {
                if (node.isDragging || node._originalPos) {
                    this.nodeRepository.updateNode(node.id, {
                        isDragging: false,
                        _originalPos: undefined
                    });
                }
            });
        }
    }
}
