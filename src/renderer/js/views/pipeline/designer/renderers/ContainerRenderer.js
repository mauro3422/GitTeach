/**
 * ContainerRenderer.js
 * Responsabilidad: Renderizado de contenedores y nodos sticky
 */

import { GeometryUtils } from '../GeometryUtils.js';
import { LayoutUtils } from '../utils/LayoutUtils.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';
import { InlineEditor } from '../interaction/InlineEditor.js';
import { DesignerEvents } from '../core/DesignerEvents.js';
import { TextRenderer } from './TextRenderer.js';
import { VisualEffects } from '../utils/VisualEffects.js';

export const ContainerRenderer = {
    /**
     * Get neon color for a node. Uses ThemeManager's persistent cache.
     */
    getNodeColor(node) {
        // For containers and sticky notes, use persistent neon palette
        if (node.isRepoContainer || node.isStickyNote) {
            return ThemeManager.getNeonColorForId(node.id);
        }
        // For regular nodes, use explicit color if set
        return node.color || ThemeManager.colors.accent;
    },

    /**
     * Draw containers and sticky notes
     */
    render(ctx, nodes, camera, hoveredNodeId = null, dropTargetId = null, resizingNodeId = null) {
        const zoomScale = camera.zoomScale;

        // Phase 1: Containers (background)
        Object.values(nodes).forEach(node => {
            if (!node.isRepoContainer) return;

            const neonColor = this.getNodeColor(node);
            const isDropTarget = node.id === dropTargetId;
            const isResizing = node.id === resizingNodeId;
            const isHovered = node.id === hoveredNodeId;
            const isDragging = node.isDragging;

            // DEBUG: Proof shared IDs
            // Render container with visual state

            const bounds = GeometryUtils.getContainerBounds(node, nodes, zoomScale, dropTargetId);
            const sW = bounds.w;
            const sH = bounds.h;
            const centerX = bounds.centerX || node.x;
            const centerY = bounds.centerY || node.y;

            if (isDropTarget) {
                // Special drop target panel
                ctx.save();
                ctx.beginPath(); // CRITICAL: Prevent path accumulation
                ctx.fillStyle = neonColor + '30';
                ctx.strokeStyle = neonColor;
                ctx.lineWidth = 4;
                ctx.shadowBlur = 40;
                ctx.shadowColor = neonColor;
                CanvasPrimitives.roundRect(ctx, centerX - sW / 2, centerY - sH / 2, sW, sH, 12);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else {
                // Glass panel with neon glow
                VisualEffects.drawGlassPanel(ctx, centerX - sW / 2, centerY - sH / 2, sW, sH, 12, {
                    shadowColor: neonColor,
                    shadowBlur: 15,
                    borderColor: neonColor,
                    borderWidth: isResizing ? 3 : (isHovered || isDragging ? 2.5 : 1.5),
                    isResizing: isResizing,
                    isHovered: isHovered || isDragging
                });
            }

            // Resize Handles (visible on hover or during resize)
            if (isHovered || isResizing) {
                const corners = [
                    { x: centerX - sW / 2, y: centerY - sH / 2 },
                    { x: centerX + sW / 2, y: centerY - sH / 2 },
                    { x: centerX - sW / 2, y: centerY + sH / 2 },
                    { x: centerX + sW / 2, y: centerY + sH / 2 }
                ];
                VisualEffects.drawResizeHandles(ctx, corners, zoomScale, {
                    color: neonColor,
                    activeCorner: null, // TODO: Pass actual active corner if available
                    handleSize: isResizing ? 16 : 12
                });
            }
        });

        // Phase 2: Sticky Notes
        // Phase 2: Sticky Notes
        Object.values(nodes).forEach(node => {
            if (!node.isStickyNote) return;

            const { x, y, dimensions, id } = node;
            const neonColor = this.getNodeColor(node);
            const w = dimensions?.w || 180;
            const h = dimensions?.h || 100;
            const isResizing = id === resizingNodeId;
            const isHovered = id === hoveredNodeId;

            // --- 1. CALCULATE CONTENT REQUIREMENTS (Dynamic Inflation) ---
            let padding = 15;
            let renderW = w;
            let renderH = h;
            let worldFontSize = 0;
            let worldLineHeight = 0;

            if (node.text) {
                // ZOOM COMPENSATION: Text size in World Space increases as Zoom decreases
                // to maintain constant Screen Space readability (12px standard).
                const baseFontSize = 12;
                worldFontSize = baseFontSize / zoomScale;
                worldLineHeight = (baseFontSize + 4) / zoomScale;

                // A. Measure Width Requirement
                const words = node.text.split(/[\s\n]+/);
                let maxWordWidth = 0;
                ctx.save();
                ctx.font = `${worldFontSize}px "Fira Code", monospace`;
                words.forEach(wd => {
                    const width = ctx.measureText(wd).width;
                    if (width > maxWordWidth) maxWordWidth = width;
                });

                // B. Measure Height Requirement (using available width)
                // Use the INFLATED width if text demands it, otherwise use configured width
                const effectiveMaxWidth = Math.max(w - padding * 2, maxWordWidth);
                const lines = TextRenderer.calculateLines(ctx, node.text, effectiveMaxWidth, `${worldFontSize}px "Fira Code", monospace`);
                ctx.restore();

                const contentHeight = lines.length * worldLineHeight;
                const requiredHeight = contentHeight + padding * 2;
                const requiredWidth = maxWordWidth + padding * 2 + 10; // +10 buffer

                // C. Determine Final Render Size (Visual Inflation)
                // Visually expand box if text needs more space due to Zoom or content
                renderW = Math.max(w, requiredWidth);
                renderH = Math.max(h, requiredHeight);

                // D. Update Dimensions Metadata (For Interactability)
                if (!node.dimensions) node.dimensions = {};
                node.dimensions.renderW = renderW;
                node.dimensions.renderH = renderH;
                node.dimensions.contentMinW = requiredWidth;
                node.dimensions.contentMinH = requiredHeight;

                // E. Layout Stability (Magnetic Sizing for Layout)
                // Update persistent height ONLY if automatic sizing is active or strictly needed
                if (!dimensions.isManual && Math.abs(dimensions.h - renderH) > 1) {
                    // Auto-grow/shrink logic for automatic nodes
                    // But try to avoid "fluttering" if it's just zoom noise
                    // For now, we update it to keep layout consistent
                    dimensions.h = renderH;
                    DesignerEvents.requestRender();
                } else if (dimensions.isManual && dimensions.h < requiredHeight) {
                    // Manual nodes ONLY grow if strictly necessary to avoid overflow
                    // But we rely on visual inflation (renderH) primarily
                }
            }

            // --- 2. DRAW VISUALS (Using Inflated Sizes) ---
            ctx.save();

            // Sticky note body
            VisualEffects.drawGlassPanel(ctx, x - renderW / 2, y - renderH / 2, renderW, renderH, 8, {
                shadowColor: neonColor,
                shadowBlur: isResizing ? 25 : (isHovered ? 18 : 12),
                borderColor: neonColor,
                borderWidth: isResizing ? 3 : (isHovered ? 2.5 : 2),
                isResizing: isResizing,
                isHovered: isHovered
            });

            // Make sure InlineEditor uses these render dimensions?
            // InlineEditor reads dimensions.w/h. We should probably update w/h if we want editor to match?
            // Actually, InlineEditor logic fixed in previous step uses node.dimensions.w/h.
            // If we only update renderW/H, editor might mismatch unless we update it too.

            // Render Text
            if (node.text && InlineEditor.activeRef?.note.id !== node.id) {
                const textX = x - renderW / 2 + padding;
                const textY = y - renderH / 2 + padding;

                TextRenderer.drawMultilineText(ctx, node.text, textX, textY, {
                    maxWidth: renderW - padding * 2,
                    lineHeight: worldLineHeight,
                    font: `${worldFontSize}px "Fira Code", monospace`,
                    color: ThemeManager.colors.text,
                    align: 'left'
                });
            }

            // 🔍 DEBUG: Hit-Box
            if (window.DEBUG_STICKY) {
                ctx.save();
                ctx.strokeStyle = ThemeManager.colors.debug;
                ctx.lineWidth = 1;
                const hitW = renderW + 40;
                const hitH = renderH + 40;
                ctx.strokeRect(node.x - hitW / 2, node.y - hitH / 2, hitW, hitH);
                ctx.restore();
            }

            ctx.restore();
        });
    },



    /**
     * Draw message badge (legacy - usar CanvasPrimitives.drawBadge)
     */
    drawMessageBadge(ctx, x, y, color) {
        CanvasPrimitives.drawBadge(ctx, '✎', x, y, ThemeManager.colors.textDim);
    }
};
