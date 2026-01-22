import { DesignerStore } from '../modules/DesignerStore.js';
import { CoordinateUtils } from '../CoordinateUtils.js';

export class HoverManager {
    constructor(interactionContext) {
        this.context = interactionContext;
        this.hoveredNodeId = null;
        this.DEBUG_HIT_TEST = false;
    }

    /**
     * Update hover state based on mouse position
     * @param {Object} worldPos - position in world coordinates
     */
    update(worldPos) {
        const overNode = this.findNodeAt(worldPos);
        const newHoverId = overNode ? overNode.id : null;

        if (this.hoveredNodeId !== newHoverId) {
            this.hoveredNodeId = newHoverId;
            // Notify context of update if state changed
            if (this.context.onUpdate) this.context.onUpdate();
        }
    }

    /**
     * Find the top-most node at a world position
     * @param {Object} worldPos 
     * @param {string|null} excludeId 
     * @returns {Object|null}
     */
    findNodeAt(worldPos, excludeId = null) {
        // Use current zoom scale for hit testing precision
        const zoomScale = this.context.state ? this.context.state.zoomScale : 1.0;
        const node = DesignerStore.findNodeAt(worldPos, excludeId, zoomScale);

        // Debug logging for hit detection
        if (this.DEBUG_HIT_TEST) {
            // Disabled by default to prevent performance issues during pan
            // if (!node) {
            //     console.log(`[HitTest] No node found at WorldPos: (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
            // } else {
            //     console.log(`[HitTest] Hit: ${node.id} at (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
            // }
        }

        return node;
    }

    getHoveredNodeId() {
        return this.hoveredNodeId;
    }
}
