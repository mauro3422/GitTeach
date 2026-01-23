import { DesignerStore } from '../modules/DesignerStore.js';
import { CoordinateUtils } from '../CoordinateUtils.js';

export class HoverManager {
    constructor(interactionContext) {
        this.context = interactionContext;
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
        DesignerStore.setHover(newHoverId);

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
        return DesignerStore.state.interaction.hoveredNodeId;
    }
}
