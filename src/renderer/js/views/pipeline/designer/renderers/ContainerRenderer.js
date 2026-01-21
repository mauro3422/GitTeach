/**
 * ContainerRenderer.js
 * Responsabilidad: Renderizado de contenedores y nodos sticky
 */

import { DesignerCanvas } from '../DesignerCanvas.js';
import ContainerBoxManager from '../../../../utils/ContainerBoxManager.js';

export const ContainerRenderer = {
    /**
     * Draw containers and sticky notes
     */
    render(ctx, nodes, navState) {
        const { zoomScale } = navState;

        // Phase 1: Containers (background)
        Object.values(nodes).forEach(node => {
            if (!node.isRepoContainer) return;
            const { color, isDropTarget } = node;
            const bounds = DesignerCanvas.getContainerBounds(node, nodes, zoomScale);

            const sW = bounds.w;
            const sH = bounds.h;
            const centerX = bounds.centerX || node.x;
            const centerY = bounds.centerY || node.y;

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = isDropTarget ? 'rgba(35, 134, 54, 0.15)' : 'rgba(22, 27, 34, 0.9)';
            ctx.strokeStyle = isDropTarget ? '#3fb950' : color;
            ctx.lineWidth = isDropTarget ? 4 : 2;

            if (node.isDragging || node.isHovered) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = isDropTarget ? '#3fb950' : color;
                ctx.lineWidth = 3;
            }

            if (ctx.roundRect) ctx.roundRect(centerX - sW / 2, centerY - sH / 2, sW, sH, 12);
            else ctx.rect(centerX - sW / 2, centerY - sH / 2, sW, sH);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Resize Handles (visible on hover only)
            if (node.isHovered) {
                const handleSize = 8 / zoomScale;
                const corners = [
                    { x: centerX - sW / 2, y: centerY - sH / 2 },
                    { x: centerX + sW / 2, y: centerY - sH / 2 },
                    { x: centerX - sW / 2, y: centerY + sH / 2 },
                    { x: centerX + sW / 2, y: centerY + sH / 2 }
                ];
                ctx.save();
                ctx.fillStyle = color;
                corners.forEach(pos => {
                    ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
                });
                ctx.restore();
            }
        });

        // Phase 2: Sticky Notes
        Object.values(nodes).forEach(node => {
            if (!node.isStickyNote) return;

            const { x, y, color, dimensions } = node;
            const w = dimensions?.w || 180;
            const h = dimensions?.h || 100;

            ctx.save();

            // Background
            ctx.fillStyle = 'rgba(22, 27, 34, 0.92)';
            ctx.strokeStyle = color || '#3fb950';
            ctx.lineWidth = 2;
            ctx.shadowColor = color || '#3fb950';
            ctx.shadowBlur = node.isHovered ? 15 : 8;

            // Rounded rectangle
            const radius = 8;
            ctx.beginPath();
            ctx.moveTo(x - w / 2 + radius, y - h / 2);
            ctx.lineTo(x + w / 2 - radius, y - h / 2);
            ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + radius);
            ctx.lineTo(x + w / 2, y + h / 2 - radius);
            ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - radius, y + h / 2);
            ctx.lineTo(x - w / 2 + radius, y + h / 2);
            ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - radius);
            ctx.lineTo(x - w / 2, y - h / 2 + radius);
            ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + radius, y - h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Resize Handles
            if (node.isHovered) {
                const handleSize = 8 / zoomScale;
                const corners = [
                    { x: x - w / 2, y: y - h / 2 }, // nw
                    { x: x + w / 2, y: y - h / 2 }, // ne
                    { x: x - w / 2, y: y + h / 2 }, // sw
                    { x: x + w / 2, y: y + h / 2 }  // se
                ];
                ctx.save();
                ctx.fillStyle = color || '#3fb950';
                corners.forEach(pos => {
                    ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
                });
                ctx.restore();
            }

            ctx.restore();
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
    }
};
