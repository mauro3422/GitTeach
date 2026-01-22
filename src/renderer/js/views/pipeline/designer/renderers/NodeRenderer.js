/**
 * NodeRenderer.js
 * Responsabilidad: Renderizado de nodos individuales (no contenedores)
 */

import { DesignerCanvas } from '../DesignerCanvas.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

export const NodeRenderer = {
    /**
     * Draw regular nodes (non-containers)
     */
    render(ctx, nodes, camera, activeConnectionId, hoveredNodeId = null) {
        const zoomScale = camera.zoomScale;

        Object.values(nodes).forEach(node => {
            if (node.isRepoContainer || node.isStickyNote) return;

            const { x, y, color, id } = node;
            const radius = DesignerCanvas.getNodeRadius(node, zoomScale);
            const isHovered = id === hoveredNodeId;

            // Usar CanvasPrimitives para dibujar el círculo del nodo
            CanvasPrimitives.drawNodeCircle(ctx, x, y, radius, color,
                node.isDragging || isHovered);

            // Efectos adicionales para conexiones activas
            if (activeConnectionId === node.id) {
                ctx.save();
                ctx.shadowBlur = 20;
                ctx.shadowColor = ThemeManager.colors.primary;
                ctx.strokeStyle = ThemeManager.colors.primary;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }
};
