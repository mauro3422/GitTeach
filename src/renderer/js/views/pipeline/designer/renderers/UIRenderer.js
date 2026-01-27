/**
 * UIRenderer.js
 * Responsabilidad: Únicamente elementos que flotan sobre el canvas (tooltips, resize handles)
 */

import { GeometryUtils } from '../GeometryUtils.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { TextRenderer } from './TextRenderer.js';
import { DimensionSync } from '../DimensionSync.js';
import { VisualEffects } from '../utils/VisualEffects.js';

export const UIRenderer = {
    /**
     * Render tooltips in screen space (called after camera.restore())
     */
    renderTooltips(ctx, nodes, camera, hoveredNodeId = null, draggingNodeId = null) {
        const zoom = camera.zoomScale;

        // Desactivar tooltips durante drag para evitar bugs visuales
        if (draggingNodeId) return;

        Object.values(nodes).forEach(node => {
            const isHovered = node.id === hoveredNodeId;
            if (!isHovered || !node.description) return;

            const screenPos = camera.toScreen(node.x, node.y);

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
    },

    /**
     * Render resize handles for a node in world space (called before camera.restore())
     */
    renderResizeHandles(ctx, node, nodes, zoom, draggingNodeId = null) {
        const sync = DimensionSync.getSyncDimensions(node, nodes, zoom, null, draggingNodeId);
        const corners = GeometryUtils.getRectCorners(sync.centerX, sync.centerY, sync.w, sync.h);

        // Convert corners object to array of corner positions
        const cornerPositions = Object.values(corners);

        VisualEffects.drawResizeHandles(ctx, cornerPositions, zoom, {
            color: ThemeManager.colors.primary,
            handleSize: DESIGNER_CONSTANTS.BADGE?.SIZE || 12
        });
    }
};
