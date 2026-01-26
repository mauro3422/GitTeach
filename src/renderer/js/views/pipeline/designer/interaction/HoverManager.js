import { CoordinateUtils } from '../CoordinateUtils.js';
import { HitTester } from '../modules/services/HitTester.js';

export class HoverManager {
    constructor(dependencies = {}) {
        this.dependencies = dependencies;
        this.context = dependencies.controller;
        this.nodeRepository = dependencies.nodeRepository;
        this.interactionState = dependencies.interactionState;
        this.DEBUG_HIT_TEST = false;
    }

    /**
     * Update hover state based on mouse position
     * @param {Object} worldPos - position in world coordinates
     */
    update(worldPos) {
        const overNode = this.findNodeAt(worldPos);
        const newHoverId = overNode ? overNode.id : null;

        // Delegate to Store
        this.interactionState.setHover(newHoverId);

        // Notification for local renderer (might eventually be removed if using Store subscription)
        if (this.context.onUpdate) this.context.onUpdate();
    }

    /**
     * Find the top-most node at a world position
     * @param {Object} worldPos 
     * @param {string|null} excludeId 
     * @returns {Object|null}
     */
    findNodeAt(worldPos, excludeId = null) {
        // Use current zoom scale for hit testing precision
        const zoomScale = this.dependencies.cameraState.state ? this.dependencies.cameraState.state.zoomScale : 1.0;

        const nodes = this.dependencies.nodeRepository.state.nodes;
        const node = HitTester.findNodeAt(worldPos, nodes, zoomScale, excludeId);

        // Debug logging for hit detection
        if (this.DEBUG_HIT_TEST) {
            if (!node) {
                console.log(`[HitTest] No node found at WorldPos: (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
            } else {
                console.log(`[HitTest] Hit: ${node.id} at (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
            }
        }

        return node;
    }

    getHoveredNodeId() {
        return this.interactionState.state.hoveredNodeId;
    }
}
