/**
 * ContainerRenderer.js
 * Responsabilidad: Renderizado de contenedores y nodos sticky
 */

import { GeometryUtils } from '../GeometryUtils.js';
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
        Object.values(nodes).forEach(node => {
            if (!node.isStickyNote) return;

            const { x, y, dimensions, id } = node;
            const neonColor = this.getNodeColor(node);
            const w = dimensions?.w || 180;
            const h = dimensions?.h || 100;
            const isResizing = id === resizingNodeId;
            const isHovered = id === hoveredNodeId;

            ctx.save();

            // Sticky note with enhanced glow
            VisualEffects.drawGlassPanel(ctx, x - w / 2, y - h / 2, w, h, 8, {
                shadowColor: neonColor,
                shadowBlur: isResizing ? 25 : (isHovered ? 18 : 12),
                borderColor: neonColor,
                borderWidth: isResizing ? 3 : (isHovered ? 2.5 : 2),
                isResizing: isResizing,
                isHovered: isHovered
            });

            // Text content (Multiline, World-space)
            if (node.text && InlineEditor.activeRef?.note.id !== node.id) {
                const padding = 15;
                const textX = x - w / 2 + padding;
                const textY = y - h / 2 + padding;
                const maxWidth = w - padding * 2;

                // Calcular líneas para determinar altura necesaria
                const lines = TextRenderer.calculateLines(ctx, node.text, maxWidth, '16px "Fira Code", monospace');
                const lineHeight = 16 + 5; // fontSize + spacing
                const contentHeight = lines.length * lineHeight;
                const requiredHeight = contentHeight + padding * 2;

                // MAGNETIC SIZING: If not manually resized, adjust height to fit content
                if (!dimensions.isManual) {
                    const minH = 100;
                    const targetH = Math.max(minH, requiredHeight);

                    if (Math.abs(dimensions.h - targetH) > 1) {
                        dimensions.h = targetH;
                        dimensions.targetH = targetH;
                        // Trigger re-render to animate transition
                        DesignerEvents.requestRender();
                    }
                }

                // Renderizar texto usando TextRenderer
                TextRenderer.drawMultilineText(ctx, node.text, textX, textY, {
                    maxWidth: maxWidth,
                    lineHeight: lineHeight,
                    font: '16px "Fira Code", monospace',
                    color: ThemeManager.colors.text,
                    align: 'left'
                });
            }

            // 🔍 DEBUG: Visualizar Hit-Box Real (Solo si DEBUG_STICKY es true)
            if (window.DEBUG_STICKY) {
                ctx.save();
                ctx.strokeStyle = ThemeManager.colors.debug;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                // El interaction usa animW/animH + margen de 20
                const hitW = (node.dimensions?.animW || node.dimensions?.w || 180) + 40;
                const hitH = (node.dimensions?.animH || node.dimensions?.h || 100) + 40;
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
