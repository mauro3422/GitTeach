/**
 * NodeRenderer.js
 * Responsabilidad: Nodos individuales en Espacio de Mundo
 */

import { GeometryUtils } from '../GeometryUtils.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { VisualStateManager } from '../modules/VisualStateManager.js';
import { LabelRenderer } from '../../LabelRenderer.js';

export const NodeRenderer = {
    render(ctx, nodes, camera, activeConnectionId, hoveredNodeId = null, selectedNodeId = null) {
        const zoom = camera.zoomScale;

        Object.values(nodes).forEach(node => {
            if (node.isRepoContainer || node.isStickyNote) return;

            const { x, y, color } = node;
            const radius = GeometryUtils.getNodeRadius(node, zoom);

            const visual = VisualStateManager.getVisualState(node, {
                hoveredId: hoveredNodeId,
                selectedId: selectedNodeId,
                activeConnectionId: activeConnectionId,
                draggingId: node.isDragging ? node.id : null
            });

            ctx.save();
            ctx.globalAlpha = visual.opacity;

            if (visual.glowIntensity > 0) {
                ctx.shadowBlur = 25 * visual.glowIntensity;
                ctx.shadowColor = visual.state === VisualStateManager.STATES.SELECTED
                    ? ThemeManager.colors.primary
                    : (color || ThemeManager.colors.accent);
            }

            // Draw primary circle
            CanvasPrimitives.drawNodeCircle(ctx, x, y, radius, color, visual.state !== VisualStateManager.STATES.NORMAL);

            const vScale = GeometryUtils.getVisualScale(zoom);
            const fScale = GeometryUtils.getFontScale(zoom);

            // Icon and Label (Now definitively in World Space)
            // We pass the zoom for screen-space lines, fScale for font inflation
            LabelRenderer.drawNodeIcon(ctx, node.icon, x, y, node.isSatellite, zoom, radius);
            LabelRenderer.drawNodeLabel(ctx, node, x, y, visual.state === VisualStateManager.STATES.HOVERED, zoom, radius, fScale);

            // Selection/Connection Highlight Ring
            if (visual.state === VisualStateManager.STATES.SELECTED || activeConnectionId === node.id) {
                ctx.strokeStyle = ThemeManager.colors.primary;
                ctx.lineWidth = visual.borderWidth / zoom; // Adjust line width for zoom
                ctx.beginPath();
                ctx.arc(x, y, radius + 4 / zoom, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Message Badge (Pencil) - Moved to World Space for nodes too
            if (node.message) {
                const badgeOffset = radius * 0.7;
                CanvasPrimitives.drawBadge(ctx, '✎', x + badgeOffset, y - badgeOffset, ThemeManager.colors.textDim, 12 / zoom);
            }

            ctx.restore();
        });
    }
};
