/**
 * DEPRECATED: Use BoundsCalculator or GeometryUtils directly
 * This file exists only for backward compatibility
 */

import { BoundsCalculator } from './BoundsCalculator.js';

export const LayoutUtils = {
    /**
     * @deprecated Use BoundsCalculator.getContainerBounds() instead
     */
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        console.warn('[DEPRECATED] LayoutUtils.getContainerBounds() - use BoundsCalculator directly');
        return BoundsCalculator.getContainerBounds(node, nodes, zoomScale, dropTargetId);
    },

    /**
     * @deprecated Use GeometryUtils instead
     */
    getNodeRadius(node, zoom = 1.0) {
        console.warn('[DEPRECATED] LayoutUtils.getNodeRadius() - use GeometryUtils.getNodeRadius()');
        return BoundsCalculator.getNodeRadius(node, zoom);
    }
};

// Export to window for GeometryUtils fallback access (avoids circular import)
// REMOVED: Hack window.LayoutUtils is no longer needed with BoundsCalculator.
