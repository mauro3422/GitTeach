/**
 * UIRenderer.js
 * Responsabilidad: Renderizado de UI (labels, icons, tooltips) en espacio de pantalla
 */

import { LabelRenderer } from '../../LabelRenderer.js';
import { DesignerCanvas } from '../DesignerCanvas.js';

export const UIRenderer = {
    /**
     * Draw UI elements (labels, icons, tooltips) in screen space
     */
    render(ctx, nodes, navState) {
        const { panOffset, zoomScale } = navState;

        Object.values(nodes).forEach(node => {
            const screenX = node.x * zoomScale + panOffset.x;
            const screenY = node.y * zoomScale + panOffset.y;

            if (node.isRepoContainer) {
                const bounds = DesignerCanvas.getContainerBounds(node, nodes, zoomScale);
                const sW = bounds.w * zoomScale;
                const sH = bounds.h * zoomScale;
                LabelRenderer.drawStandardText(ctx, node.label.toUpperCase(), screenX, screenY - sH / 2 + 20, {
                    fontSize: 22,
                    color: node.isHovered ? '#ffffff' : node.color,
                    bold: true
                });

                if (node.message) {
                    this.drawMessageBadge(ctx, screenX + sW / 2 - 15, screenY - sH / 2 + 15, node.color);
                }
            } else if (node.isStickyNote) {
                const sW = (node.width || 180) * zoomScale;
                const sH = (node.height || 100) * zoomScale;

                ctx.save();
                const fSize = 18;
                ctx.font = `${fSize}px var(--font-mono), monospace`;
                ctx.fillStyle = node.color || '#3fb950';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                const maxWidth = sW - 24;
                const words = (node.text || '').split(' ');
                let line = '';
                let yOff = screenY - sH / 2 + 20;

                for (const word of words) {
                    const testLine = line + word + ' ';
                    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
                        ctx.fillText(line, screenX - sW / 2 + 12, yOff);
                        line = word + ' ';
                        yOff += fSize + 6;
                        if (yOff > screenY + sH / 2 - 25) break;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, screenX - sW / 2 + 12, yOff);
                ctx.restore();
            } else {
                // Regular Nodes
                const radius = DesignerCanvas.getNodeRadius(node, zoomScale);
                LabelRenderer.drawNodeIcon(ctx, node.icon, screenX, screenY, node.isSatellite, zoomScale, radius);
                LabelRenderer.drawNodeLabel(ctx, node, screenX, screenY, node.isHovered, zoomScale, radius);

                if (node.message) {
                    const sRadius = radius * zoomScale;
                    this.drawMessageBadge(ctx, screenX + sRadius * 0.7, screenY - sRadius * 0.7, node.color);
                }

                // Tooltip in screen space for better readability
                if (node.isHovered && node.description) {
                    this.drawDescriptionTooltip(ctx, node, screenX, screenY, node.color, zoomScale);
                }
            }
        });
    },

    /**
     * Draw message badge
     */
    drawMessageBadge(ctx, x, y, color) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f1e05a';
        ctx.fillStyle = '#f1e05a';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✎', x, y + 6);
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
