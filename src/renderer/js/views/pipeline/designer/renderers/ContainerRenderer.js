/**
 * ContainerRenderer.js
 * Responsabilidad: Contenedores y Sticky Notes en Espacio de Mundo
 */

import { GeometryUtils } from '../GeometryUtils.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { InlineEditor } from '../interaction/InlineEditor.js';
import { TextRenderer } from './TextRenderer.js';
import { VisualEffects } from '../utils/VisualEffects.js';
import { LabelRenderer } from '../../LabelRenderer.js';

export const ContainerRenderer = {
    getNodeColor(node) {
        if (node.isRepoContainer || node.isStickyNote) {
            return ThemeManager.getNeonColorForId(node.id);
        }
        return node.color || ThemeManager.colors.accent;
    },

    render(ctx, nodes, camera, hoveredNodeId = null, dropTargetId = null, resizingNodeId = null, selectedNodeId = null) {
        const zoom = camera.zoomScale;

        // Phase 1: Containers
        Object.values(nodes).forEach(node => {
            if (!node.isRepoContainer) return;

            const neonColor = this.getNodeColor(node);
            const isHovered = node.id === hoveredNodeId;
            const isSelected = node.id === selectedNodeId;

            const bounds = GeometryUtils.getContainerBounds(node, nodes, zoom, dropTargetId);
            const { w, h, centerX, centerY } = bounds;
            const x = centerX || node.x;
            const y = centerY || node.y;

            VisualEffects.drawGlassPanel(ctx, x - w / 2, y - h / 2, w, h, 12, {
                shadowColor: isSelected ? ThemeManager.colors.primary : neonColor,
                shadowBlur: isSelected ? 30 : 20,
                borderColor: isSelected ? ThemeManager.colors.primary : neonColor,
                borderWidth: isSelected ? 4 : (isHovered ? 3 : 2),
                isHovered: isHovered || isSelected
            });

            // Label (World Space)
            const labelY = y - h / 2 + 25 / zoom;
            const baseFontSize = node.isRepoContainer ? 24 : 20;
            const fScale = GeometryUtils.getFontScale(zoom, baseFontSize);

            LabelRenderer.drawStandardText(ctx, node.label?.toUpperCase() || 'BOX', x, labelY, {
                fontSize: baseFontSize,
                color: (isSelected || isHovered) ? ThemeManager.colors.text : neonColor,
                bold: true,
                zoom: zoom,
                fScale: fScale
            });

            // Message Badge (Pencil)
            if (node.message) {
                const badgeX = x + w / 2 - 15 / zoom;
                const badgeY = y - h / 2 + 15 / zoom;
                CanvasPrimitives.drawBadge(ctx, '✎', badgeX, badgeY, ThemeManager.colors.textDim, 12 / zoom);
            }
        });

        // Phase 2: Sticky Notes
        Object.values(nodes).forEach(node => {
            if (!node.isStickyNote) return;

            const { x, y } = node;
            const neonColor = this.getNodeColor(node);
            const isHovered = node.id === hoveredNodeId;
            const isSelected = node.id === selectedNodeId;

            const bounds = GeometryUtils.getStickyNoteBounds(node, ctx, zoom);
            const { renderW, renderH } = bounds;
            const padding = ThemeManager.geometry.sticky.padding;

            ctx.save();
            VisualEffects.drawGlassPanel(ctx, x - renderW / 2, y - renderH / 2, renderW, renderH, 8, {
                shadowColor: isSelected ? ThemeManager.colors.primary : neonColor,
                shadowBlur: isSelected ? 30 : 20,
                borderColor: isSelected ? ThemeManager.colors.primary : neonColor,
                borderWidth: isSelected ? 4 : (isHovered ? 3 : 2.5),
                isHovered: isHovered || isSelected
            });

            // Text (World Space) - PAPER SCALING
            if (node.text && (!InlineEditor.activeRef || InlineEditor.activeRef.note.id !== node.id)) {
                const baseFontSize = 18;
                const fScale = GeometryUtils.getFontScale(zoom, baseFontSize);

                const worldFontSize = baseFontSize * fScale;
                const worldLineHeight = worldFontSize + 6;

                TextRenderer.drawMultilineText(ctx, node.text, x - renderW / 2 + padding, y - renderH / 2 + padding, {
                    maxWidth: renderW - padding * 2,
                    lineHeight: worldLineHeight,
                    font: `${worldFontSize}px ${ThemeManager.colors.fontMono}`,
                    color: ThemeManager.colors.text,
                    align: 'left'
                });
            }
            ctx.restore();
        });
    }
};
