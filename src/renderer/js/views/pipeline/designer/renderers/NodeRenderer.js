/**
 * NodeRenderer.js
 * Responsabilidad: Renderizado de nodos individuales (no contenedores)
 */

import { DesignerCanvas } from '../DesignerCanvas.js';

export const NodeRenderer = {
    /**
     * Draw regular nodes (non-containers)
     */
    render(ctx, nodes, navState, activeConnectionId) {
        const { zoomScale } = navState;

        Object.values(nodes).forEach(node => {
            if (node.isRepoContainer || node.isStickyNote) return;

            const { x, y, color } = node;
            const radius = DesignerCanvas.getNodeRadius(node, zoomScale);

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            if (node.isDragging || node.isHovered) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.lineWidth = 3;
            }
            if (activeConnectionId === node.id) {
                ctx.shadowBlur = 20; ctx.shadowColor = '#2f81f7';
                ctx.lineWidth = 4; ctx.strokeStyle = '#2f81f7';
            }

            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
    }
};
