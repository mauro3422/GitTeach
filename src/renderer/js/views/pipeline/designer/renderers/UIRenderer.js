/**
 * UIRenderer.js
 * Responsabilidad: Únicamente elementos que flotan sobre el canvas (tooltips)
 */

import { GeometryUtils } from '../GeometryUtils.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { TextRenderer } from './TextRenderer.js';

export const UIRenderer = {
    /**
     * Draw UI overlays (tooltips) in screen space
     */
    render(ctx, nodes, camera, hoveredNodeId = null, dropTargetId = null) {
        Object.values(nodes).forEach(node => {
            const isHovered = node.id === hoveredNodeId;
            if (!isHovered || !node.description) return;

            const screenPos = camera.toScreen(node.x, node.y);
            const zoom = camera.zoomScale;

            // Adjust radius for tooltip offset based on inflation
            const radius = GeometryUtils.getNodeRadius(node, zoom) * zoom;

            const { TOOLTIP } = DESIGNER_CONSTANTS.VISUAL;
            TextRenderer.drawTooltip(ctx, node.description, screenPos.x + radius, screenPos.y - radius, {
                bgColor: ThemeManager.colors.tooltipBg,
                borderColor: node.color || ThemeManager.colors.tooltipBorder,
                textColor: ThemeManager.colors.text,
                maxWidth: TOOLTIP.MAX_WIDTH,
                fontSize: TOOLTIP.FONT_SIZE
            });
        });
    }
};
