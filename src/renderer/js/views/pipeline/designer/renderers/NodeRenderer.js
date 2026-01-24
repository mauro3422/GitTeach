/**
 * NodeRenderer.js
 * Responsabilidad: Nodos individuales en Espacio de Mundo
 */

import { GeometryUtils } from '../GeometryUtils.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { NodeVisualManager } from '../modules/NodeVisualManager.js';
import { LabelRenderer } from '../../LabelRenderer.js';
import { TextScalingManager } from '../utils/TextScalingManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export const NodeRenderer = {
    render(ctx, nodes, camera, activeConnectionId, hoveredNodeId = null, selectedNodeId = null) {
        const zoom = camera.zoomScale;

        // LEVEL 2: Per-node error boundary
        Object.values(nodes).forEach(node => {
            try {
                if (node.isRepoContainer || node.isStickyNote) return;

                const { x, y, color } = node;
                const radius = GeometryUtils.getNodeRadius(node, zoom);

                const visual = NodeVisualManager.getNodeVisualState(node, {
                    hoveredNodeId: hoveredNodeId,
                    selectedNodeId: selectedNodeId,
                    draggingNodeId: node.isDragging ? node.id : null
                });

                ctx.save();
                ctx.globalAlpha = visual.opacity;

                // ROBUST PATTERN: Selection only brightens the border, doesn't change color
                const glowColor = color || ThemeManager.colors.accent;

                if (visual.glowIntensity > 0) {
                    const glowConfig = NodeVisualManager.getGlowConfig(visual);
                    ctx.shadowBlur = glowConfig.shadowBlur;
                    ctx.shadowColor = glowConfig.shadowColor;
                }

                // Draw primary circle
                CanvasPrimitives.drawNodeCircle(ctx, x, y, radius, color, visual.state !== 'normal');

                // CRITICAL FIX: Reset shadow/glow BEFORE drawing icon to prevent it from being covered
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';

                const vScale = GeometryUtils.getVisualScale(zoom);
                // ROBUST PATTERN: Use TextScalingManager (Single Source of Truth)
                const fScale = TextScalingManager.getFontScale(zoom);

                // Icon and Label (Now definitively in World Space)
                // We pass the zoom for screen-space lines, fScale for font inflation
                LabelRenderer.drawNodeIcon(ctx, node.icon, x, y, node.isSatellite, zoom, radius);
                LabelRenderer.drawNodeLabel(ctx, node, x, y, visual.state === 'HOVERED', zoom, radius, fScale);

                // Message Badge (Pencil) - Moved to World Space for nodes too
                if (node.message) {
                    const { BADGE } = DESIGNER_CONSTANTS.VISUAL;
                    const badgeOffset = radius * BADGE.NODE_BADGE_RATIO;
                    CanvasPrimitives.drawBadge(ctx, '✎', x + badgeOffset, y - badgeOffset, ThemeManager.colors.textDim, BADGE.SIZE / zoom);
                }

                ctx.restore();
            } catch (e) {
                console.warn(`[NodeRenderer] Failed to render node ${node?.id}:`, e.message);
                // Continue to next node
            }
        });
    }
};
