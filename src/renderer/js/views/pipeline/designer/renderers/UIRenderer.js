/**
 * UIRenderer.js
 * Responsabilidad: Renderizado de UI (labels, icons, tooltips) en espacio de pantalla
 */

import { LabelRenderer } from '../../LabelRenderer.js';
import { DesignerCanvas } from '../DesignerCanvas.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { ModalManager } from '../modules/ModalManager.js';

export const UIRenderer = {
    /**
     * Draw UI elements (labels, icons, tooltips) in screen space
     */
    render(ctx, nodes, camera, hoveredNodeId = null, dropTargetId = null) {

        Object.values(nodes).forEach(node => {
            const screenPos = camera.toScreen(node.x, node.y);
            const screenX = screenPos.x;
            const screenY = screenPos.y;
            const isHovered = node.id === hoveredNodeId;

            if (node.isRepoContainer) {
                const bounds = DesignerCanvas.getContainerBounds(node, nodes, camera.zoomScale, dropTargetId);
                const cX = bounds.centerX || node.x;
                const cY = bounds.centerY || node.y;
                const screenCenter = camera.toScreen(cX, cY);
                const scX = screenCenter.x;
                const scY = screenCenter.y;

                const sW = bounds.w * camera.zoomScale;
                const sH = bounds.h * camera.zoomScale;
                const neonColor = ThemeManager.getNeonColorForId(node.id);

                LabelRenderer.drawStandardText(ctx, node.label?.toUpperCase() || 'BOX', scX, scY - sH / 2 + 20, {
                    fontSize: 22,
                    color: isHovered ? '#ffffff' : neonColor,
                    bold: true
                });

                if (node.message) {
                    this.drawMessageBadge(ctx, scX + sW / 2 - 15, scY - sH / 2 + 15, node.color);
                }
            } else if (node.isStickyNote) {
                // Render unificado en World Space
            } else {
                // Regular Nodes
                const radius = DesignerCanvas.getNodeRadius(node, camera.zoomScale);
                LabelRenderer.drawNodeIcon(ctx, node.icon, screenX, screenY, node.isSatellite, camera.zoomScale, radius);
                LabelRenderer.drawNodeLabel(ctx, node, screenX, screenY, isHovered, camera.zoomScale, radius);

                if (node.message) {
                    const sRadius = radius * camera.zoomScale;
                    this.drawMessageBadge(ctx, screenX + sRadius * 0.7, screenY - sRadius * 0.7, node.color);
                }

                // Tooltip in screen space for better readability
                if (isHovered && node.description) {
                    this.drawDescriptionTooltip(ctx, node, screenX, screenY, node.color, camera.zoomScale);
                }
            }
        });
    },

    /**
     * Draw message badge using CanvasPrimitives
     */
    drawMessageBadge(ctx, x, y, color) {
        CanvasPrimitives.drawBadge(ctx, '✎', x, y, ThemeManager.colors.textDim);
    },

    /**
     * Draw description tooltip
     */
    drawDescriptionTooltip(ctx, node, screenX, screenY, color, zoomScale) {
        const radius = (node.isRepoContainer ? 75 : 45) * zoomScale;
        const tooltipX = screenX + radius;
        const tooltipY = screenY - radius;
        const maxWidth = 220;

        ctx.save();
        const fontSize = 15;
        ctx.font = `${fontSize}px var(--font-mono), monospace`;
        const words = (node.description || '').split(' ');
        let lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });
        lines.push(currentLine);

        const tooltipH = (lines.length * (fontSize + 6)) + 20;
        const tooltipW = maxWidth + 20;

        ctx.beginPath();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.fillStyle = 'rgba(13, 17, 23, 0.98)';
        ctx.strokeStyle = color || '#8b949e';
        ctx.lineWidth = 2;
        if (ctx.roundRect) ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 10);
        else ctx.rect(tooltipX, tooltipY, tooltipW, tooltipH);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e6edf3';
        lines.forEach((line, i) => {
            ctx.fillText(line, tooltipX + 10, tooltipY + 10 + i * (fontSize + 6));
        });
        ctx.restore();
    }
};
