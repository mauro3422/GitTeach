/**
 * ContainerRenderer.js
 * Responsabilidad: Renderizado de contenedores y nodos sticky
 */

import { DesignerCanvas } from '../DesignerCanvas.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';
import { ResizeHandler } from '../interaction/ResizeHandler.js';
import { ModalManager } from '../modules/ModalManager.js';

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
    render(ctx, nodes, camera, hoveredNodeId = null, dropTargetId = null) {
        const zoomScale = camera.zoomScale;
        const resizingNodeId = ResizeHandler.state?.resizingNodeId;

        // Phase 1: Containers (background)
        Object.values(nodes).forEach(node => {
            if (!node.isRepoContainer) return;

            const neonColor = this.getNodeColor(node);
            const isDropTarget = node.id === dropTargetId;
            const isResizing = node.id === resizingNodeId;
            const isHovered = node.id === hoveredNodeId;
            const isDragging = node.isDragging;

            // DEBUG: Proof shared IDs
            if (isHovered) {
                console.log(`[Render] 🔥 Hovered ID: ${node.id} (${node.label || 'unlabeled'})`);
            }

            const bounds = DesignerCanvas.getContainerBounds(node, nodes, zoomScale, dropTargetId);
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
                CanvasPrimitives.drawGlassPanel(ctx, centerX, centerY, sW, sH, 12, {
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
                this.drawResizeHandles(ctx, centerX, centerY, sW, sH, zoomScale, neonColor, isResizing);
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
            CanvasPrimitives.drawGlassPanel(ctx, x, y, w, h, 8, {
                shadowColor: neonColor,
                shadowBlur: isResizing ? 25 : (isHovered ? 18 : 12),
                borderColor: neonColor,
                borderWidth: isResizing ? 3 : (isHovered ? 2.5 : 2),
                isResizing: isResizing,
                isHovered: isHovered
            });

            // Text content (Multiline, World-space)
            if (node.text && ModalManager.activeInlineRef?.note.id !== node.id) {
                ctx.fillStyle = ThemeManager.colors.text;
                const fontSize = 16;
                const fontFamily = '"Fira Code", monospace';
                ctx.font = `${fontSize}px ${fontFamily}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                const padding = 15;
                const maxWidth = w - padding * 2;
                const words = (node.text || '').split(' ');
                let line = '';
                let yOff = y - h / 2 + padding;
                const lineHeight = fontSize + 5;

                for (const word of words) {
                    const testLine = line + word + ' ';
                    const metrics = ctx.measureText(testLine);

                    if (metrics.width > maxWidth && line !== '') {
                        ctx.fillText(line, x - w / 2 + padding, yOff);
                        line = word + ' ';
                        yOff += lineHeight;

                        // Enforce Height Limits (Overflow Protection)
                        if (yOff + lineHeight > y + h / 2 - padding) {
                            ctx.fillText(line.substring(0, line.length - 3) + '...', x - w / 2 + padding, yOff);
                            line = '';
                            break;
                        }
                    } else {
                        line = testLine;
                    }
                }
                if (line) {
                    ctx.fillText(line, x - w / 2 + padding, yOff);
                    yOff += lineHeight;
                }

                // MAGNETIC SIZING: If not manually resized, adjust height to fit content
                if (!dimensions.isManual) {
                    const contentHeight = (yOff - (y - h / 2)) + padding;
                    const minH = 100;
                    const targetH = Math.max(minH, contentHeight);

                    if (Math.abs(dimensions.h - targetH) > 1) {
                        dimensions.h = targetH;
                        dimensions.targetH = targetH;
                        // Trigger re-render to animate transition
                        if (window.RoutingDesigner) window.RoutingDesigner.render();
                    }
                }
            }

            // 🔍 DEBUG: Visualizar Hit-Box Real (Solo si DEBUG_STICKY es true)
            if (window.DEBUG_STICKY) {
                ctx.save();
                ctx.strokeStyle = '#ff00ff';
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
     * Draw resize handles at corners with neon glow
     */
    drawResizeHandles(ctx, centerX, centerY, w, h, zoomScale, neonColor, isResizing) {
        const handleSize = isResizing ? 16 / zoomScale : 12 / zoomScale;
        const corners = [
            { x: centerX - w / 2, y: centerY - h / 2 },
            { x: centerX + w / 2, y: centerY - h / 2 },
            { x: centerX - w / 2, y: centerY + h / 2 },
            { x: centerX + w / 2, y: centerY + h / 2 }
        ];

        corners.forEach(pos => {
            ctx.save();

            // Neon glow layer
            ctx.shadowBlur = isResizing ? 25 : 12;
            ctx.shadowColor = neonColor;

            // Fill with subtle color or white center
            ctx.fillStyle = isResizing ? neonColor : 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = neonColor;
            ctx.lineWidth = isResizing ? 3 : 2;

            ctx.beginPath();
            ctx.rect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();

            // Extra glow ring during resize
            if (isResizing) {
                ctx.strokeStyle = neonColor + '60';
                ctx.lineWidth = 5;
                ctx.shadowBlur = 35;
                ctx.stroke();
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

