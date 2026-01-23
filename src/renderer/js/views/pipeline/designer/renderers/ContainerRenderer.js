import { GeometryUtils } from '../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { InlineEditor } from '../interaction/InlineEditor.js';
import { TextRenderer } from './TextRenderer.js';
import { VisualEffects } from '../utils/VisualEffects.js';
import { LabelRenderer } from '../../LabelRenderer.js';
import { DimensionSync } from '../DimensionSync.js';

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

            const sync = DimensionSync.getSyncDimensions(node, nodes, zoom);
            const { w, h, centerX, centerY } = sync;
            const x = centerX;
            const y = centerY;

            const { VISUAL } = DESIGNER_CONSTANTS;
            VisualEffects.drawGlassPanel(ctx, x - w / 2, y - h / 2, w, h, VISUAL.PANEL_RADIUS.CONTAINER, {
                shadowColor: isSelected ? ThemeManager.colors.primary : neonColor,
                shadowBlur: isSelected ? 30 : 20,
                borderColor: isSelected ? ThemeManager.colors.primary : neonColor,
                borderWidth: isSelected ? VISUAL.BORDER.RESIZING : (isHovered ? VISUAL.BORDER.SELECTED : VISUAL.BORDER.HOVERED),
                isHovered: isHovered || isSelected
            });

            // Label (World Space)
            const { BADGE, PANEL_RADIUS } = DESIGNER_CONSTANTS.VISUAL;
            const { TYPOGRAPHY } = DESIGNER_CONSTANTS;
            const labelY = y - h / 2 + BADGE.LABEL_OFFSET_Y / zoom;
            const baseFontSize = node.isRepoContainer ? TYPOGRAPHY.CONTAINER_FONT_SIZE : TYPOGRAPHY.CONTAINER_SUB_FONT_SIZE;
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
                const badgeX = x + w / 2 - BADGE.OFFSET / zoom;
                const badgeY = y - h / 2 + BADGE.OFFSET / zoom;
                CanvasPrimitives.drawBadge(ctx, '✎', badgeX, badgeY, ThemeManager.colors.textDim, BADGE.SIZE / zoom);
            }
        });

        // Phase 2: Sticky Notes
        Object.values(nodes).forEach(node => {
            if (!node.isStickyNote) return;

            const { x, y } = node;
            const neonColor = this.getNodeColor(node);
            const isHovered = node.id === hoveredNodeId;
            const isSelected = node.id === selectedNodeId;

            const sync = DimensionSync.getSyncDimensions(node, null, zoom);
            const { w: renderW, h: renderH } = sync;
            const padding = ThemeManager.geometry.sticky.padding;

            const { VISUAL } = DESIGNER_CONSTANTS;
            ctx.save();
            VisualEffects.drawGlassPanel(ctx, x - renderW / 2, y - renderH / 2, renderW, renderH, VISUAL.PANEL_RADIUS.STICKY, {
                shadowColor: isSelected ? ThemeManager.colors.primary : neonColor,
                shadowBlur: isSelected ? 30 : 20,
                borderColor: isSelected ? ThemeManager.colors.primary : neonColor,
                borderWidth: isSelected ? VISUAL.BORDER.RESIZING : (isHovered ? VISUAL.BORDER.SELECTED : VISUAL.BORDER.HOVERED + 0.5),
                isHovered: isHovered || isSelected
            });

            // Text (World Space) - PAPER SCALING
            if (node.text && (!InlineEditor.activeRef || InlineEditor.activeRef.note.id !== node.id)) {
                const baseFontSize = DESIGNER_CONSTANTS.TYPOGRAPHY.STICKY_FONT_SIZE;
                const fScale = GeometryUtils.getFontScale(zoom, baseFontSize);

                const worldFontSize = baseFontSize * fScale;
                const worldLineHeight = worldFontSize + DESIGNER_CONSTANTS.TYPOGRAPHY.LINE_HEIGHT_OFFSET;

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
