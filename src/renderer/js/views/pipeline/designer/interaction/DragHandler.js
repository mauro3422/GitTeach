
import { InteractionHandler } from '../InteractionHandler.js';
import { GeometryUtils } from '../GeometryUtils.js';

export class DragHandler extends InteractionHandler {
    constructor(controller) {
        super(controller);
        this.nodeProvider = null; // Will use controller.nodes ideally, but keeping flexibility
    }

    /**
     * Start dragging a node
     * @param {MouseEvent} e
     * @param {Object} context - { nodeId: string, initialPos: {x,y} }
     */
    onStart(e, context) {
        const { nodeId, initialPos } = context;
        if (!nodeId) return;

        const nodes = this.controller.nodes;
        const node = nodes[nodeId];
        if (!node) return;

        this.setState({
            draggingNodeId: nodeId,
            dragStart: { ...initialPos },
            dragOffset: {
                x: initialPos.x - node.x,
                y: initialPos.y - node.y
            },
            dropTargetId: null
        });

        node.isDragging = true;
    }

    /**
     * Update drag position
     * @param {MouseEvent} e
     */
    onUpdate(e) {
        const state = this.getState();
        if (!state.draggingNodeId) return;

        // Get fresh mouse pos from controller
        const mousePos = this.controller.screenToWorld(this.controller.getMousePos(e));

        const nodes = this.controller.nodes;
        const node = nodes[state.draggingNodeId];
        if (!node) return;

        // Update node position
        node.x = mousePos.x - state.dragOffset.x;
        node.y = mousePos.y - state.dragOffset.y;

        // Handle group dragging
        if (node.isRepoContainer) {
            this.updateChildPositions(node, mousePos);
        }

        // Update drop target detection
        this.updateDropTarget(mousePos, nodes);
    }

    /**
     * End dragging
     * @param {MouseEvent} e
     */
    onEnd(e) {
        const state = this.getState();
        if (!state.draggingNodeId) return;

        const nodes = this.controller.nodes;
        const node = nodes[state.draggingNodeId];

        if (node) {
            node.isDragging = false;

            // Handle Drop
            if (state.dropTargetId && this.controller.onNodeDrop) {
                this.controller.onNodeDrop(state.draggingNodeId, state.dropTargetId);
            }
            // Handle Unparent
            else if (node.parentId) {
                this.handleUnparenting(node);
            }
        }

        this.cleanupState(nodes);
    }

    onCancel() {
        const nodes = this.controller.nodes;
        this.cleanupState(nodes);
    }

    // --- Helper Methods ---

    updateChildPositions(containerNode, mousePos) {
        const nodes = this.controller.nodes;
        const state = this.getState();
        const dx = mousePos.x - state.dragStart.x;
        const dy = mousePos.y - state.dragStart.y;

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

    updateDropTarget(mousePos, nodes) {
        const draggingNode = nodes[this.state.draggingNodeId];
        if (!draggingNode || draggingNode.isRepoContainer) {
            this.state.dropTargetId = null;
            return;
        }

        const target = this.findDropTarget(mousePos, nodes);
        this.state.dropTargetId = target ? target.id : null;
    }

    findDropTarget(worldPos, nodes) {
        const nodeList = Object.values(nodes);
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (!node.isRepoContainer) continue;
            if (node.id === this.state.draggingNodeId) continue;

            const bounds = GeometryUtils.getContainerBounds(node, nodes);
            const w = bounds.w;
            const h = bounds.h;

            // Simple hit test on bounds
            if (worldPos.x >= (bounds.centerX || node.x) - w / 2 &&
                worldPos.x <= (bounds.centerX || node.x) + w / 2 &&
                worldPos.y >= (bounds.centerY || node.y) - h / 2 &&
                worldPos.y <= (bounds.centerY || node.y) + h / 2) {
                return node;
            }
        }
        return null;
    }

    handleUnparenting(node) {
        const nodes = this.controller.nodes;
        const parentId = node.parentId;
        if (!parentId) return;

        const parent = nodes[parentId];
        if (!parent) return;

        const bounds = GeometryUtils.getContainerBounds(parent, nodes);
        const margin = 20;

        const isInside = node.x >= bounds.centerX - bounds.w / 2 - margin &&
            node.x <= bounds.centerX + bounds.w / 2 + margin &&
            node.y >= bounds.centerY - bounds.h / 2 - margin &&
            node.y <= bounds.centerY + bounds.h / 2 + margin;

        if (!isInside) {
            console.log(`[DragHandler] Unparented ${node.id} from ${parentId}`);
            node.parentId = null;
        }
    }

    cleanupState(nodes) {
        if (nodes) {
            Object.values(nodes).forEach(child => {
                delete child._originalPos;
            });
        }
        this.clearState();
    }
}
