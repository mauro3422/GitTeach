import { GeometryUtils } from '../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { InlineEditor } from '../interaction/InlineEditor.js';
import { TextRenderer } from './TextRenderer.js';
import { VisualEffects } from '../utils/VisualEffects.js';
import { LabelRenderer } from '../../LabelRenderer.js';
import { DimensionSync } from '../DimensionSync.js';
import { TextScalingManager } from '../utils/TextScalingManager.js';

export const ContainerRenderer = {
    getNodeColor(node) {
        if (node.isRepoContainer || node.isStickyNote) {
            return ThemeManager.getNeonColorForId(node.id);
        }
        return node.color || ThemeManager.colors.accent;
    },

    render(ctx, nodes, camera, visibleNodeIds = null, hoveredNodeId = null, dropTargetId = null, resizingNodeId = null, selectedNodeId = null, draggingNodeId = null) {
        const zoom = camera.zoomScale;

        // Phase 1: Containers
        Object.values(nodes).forEach(node => {
            if (!node.isRepoContainer) return;

            // PERFORMANCE: Viewport Culling
            if (visibleNodeIds && !visibleNodeIds.has(node.id)) return;

            try {
                const neonColor = this.getNodeColor(node);
                const isHovered = node.id === hoveredNodeId;
                const isSelected = node.id === selectedNodeId;

                const sync = DimensionSync.getSyncDimensions(node, nodes, zoom, dropTargetId, draggingNodeId);
                const { w, h, centerX, centerY } = sync;
                const x = centerX;
                const y = centerY;

                const { VISUAL } = DESIGNER_CONSTANTS;
                // ROBUST PATTERN: Selection only brightens the border, doesn't change color
                VisualEffects.drawGlassPanel(ctx, x - w / 2, y - h / 2, w, h, VISUAL.PANEL_RADIUS.CONTAINER, {
                    shadowColor: neonColor,
                    shadowBlur: isSelected ? 40 : (isHovered ? 25 : 20),
                    borderColor: neonColor,
                    borderWidth: isSelected ? VISUAL.BORDER.RESIZING : (isHovered ? VISUAL.BORDER.SELECTED : VISUAL.BORDER.HOVERED),
                    isHovered: isHovered || isSelected
                });

                // Label (World Space) - ROBUST PATTERN: Use TextScalingManager
                const { BADGE, PANEL_RADIUS } = DESIGNER_CONSTANTS.VISUAL;
                const { TYPOGRAPHY } = DESIGNER_CONSTANTS;
                const labelY = y - h / 2 + BADGE.LABEL_OFFSET_Y / zoom;
                const baseFontSize = node.isRepoContainer ? TYPOGRAPHY.CONTAINER_FONT_SIZE : TYPOGRAPHY.CONTAINER_SUB_FONT_SIZE;
                const fScale = TextScalingManager.getFontScale(zoom, baseFontSize);

                // Draw Icon (NEW: Positioned directly below title for compactness)
                if (node.icon) {
                    const iconX = x; // Center
                    const iconY = labelY + 12 / zoom; // Even more compact (12px) to keep it tightly coupled with the title
                    LabelRenderer.drawNodeIcon(ctx, node.icon, iconX, iconY, false, zoom, 18);
                }

                LabelRenderer.drawStandardText(ctx, node.label?.toUpperCase() || 'BOX', x, labelY, {
                    fontSize: baseFontSize,
                    color: (isSelected || isHovered) ? ThemeManager.colors.text : neonColor,
                    bold: true,
                    zoom: zoom,
                    fScale: fScale
                });

                // DRAW INTERNAL COMPONENT LABELS ("Blue Labels")
                if (node.internalClasses && node.internalClasses.length > 0) {
                    const startY = labelY + (35 / zoom); // Start below the main title
                    const itemHeight = 30 / zoom;

                    // NEW: Filter out classes that are ALREADY rendered as physical child nodes
                    // Robust check: Normalize strings (trim + lowercase) to ensure matching works even if renamed slightly
                    const existingNodeLabels = new Set();
                    Object.values(nodes).forEach(n => {
                        if (n.label) existingNodeLabels.add(n.label.trim().toLowerCase());
                    });

                    // Filter: Must not be a path AND must not already exist as a node anywhere on the canvas
                    const visibleClasses = node.internalClasses.filter(c => {
                        if (c.includes('/')) return false; // Folders are NEVER badges on canvas
                        const normalizedClass = c.trim().toLowerCase();
                        // If it's on canvas as a node, we hide the blue badge (even if it's still a child)
                        return !existingNodeLabels.has(normalizedClass);
                    });

                    visibleClasses.forEach((className, idx) => {
                        const itemY = startY + (idx * itemHeight);
                        // Heuristic width based on char count approx
                        const width = (className.length * 9 + 20) / zoom;

                        LabelRenderer.drawInternalLabel(ctx, className, x, itemY, width, zoom);
                    });
                }

                // Message Badge (Pencil)
                if (node.message) {
                    const badgeX = x + w / 2 - BADGE.OFFSET / zoom;
                    const badgeY = y - h / 2 + BADGE.OFFSET / zoom;
                    CanvasPrimitives.drawBadge(ctx, '✎', badgeX, badgeY, ThemeManager.colors.textDim, BADGE.SIZE / zoom);
                }
            } catch (e) {
                console.error(`[ContainerRenderer] Failed to render container ${node.id}:`, e.message);
            }
        });

        // Phase 2: Sticky Notes
        Object.values(nodes).forEach(node => {
            if (!node.isStickyNote) return;

            // PERFORMANCE: Viewport Culling
            if (visibleNodeIds && !visibleNodeIds.has(node.id)) return;

            try {
                const { x, y } = node;
                const neonColor = this.getNodeColor(node);
                const isHovered = node.id === hoveredNodeId;
                const isSelected = node.id === selectedNodeId;

                const sync = DimensionSync.getSyncDimensions(node, null, zoom);
                const { w: renderW, h: renderH } = sync;
                const padding = ThemeManager.geometry.sticky.padding;

                const { VISUAL } = DESIGNER_CONSTANTS;
                ctx.save();
                // ROBUST PATTERN: Selection only brightens the border, doesn't change color
                VisualEffects.drawGlassPanel(ctx, x - renderW / 2, y - renderH / 2, renderW, renderH, VISUAL.PANEL_RADIUS.STICKY, {
                    shadowColor: neonColor,
                    shadowBlur: isSelected ? 40 : (isHovered ? 25 : 20),
                    borderColor: neonColor,
                    borderWidth: isSelected ? VISUAL.BORDER.RESIZING : (isHovered ? VISUAL.BORDER.SELECTED : VISUAL.BORDER.HOVERED + 0.5),
                    isHovered: isHovered || isSelected
                });

                // Text (World Space) - ROBUST PATTERN: Use TextScalingManager
                if (node.text && (!InlineEditor.activeRef || InlineEditor.activeRef.note.id !== node.id)) {
                    const baseFontSize = DESIGNER_CONSTANTS.TYPOGRAPHY.STICKY_FONT_SIZE;
                    const worldFontSize = TextScalingManager.getWorldFontSize(baseFontSize, zoom);
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
            } catch (e) {
                console.error(`[ContainerRenderer] Failed to render sticky note ${node.id}:`, e.message);
            }
        });
    }
};
