/**
 * UIRenderer.js
 * Responsabilidad: Renderizado de UI (labels, icons, tooltips) en espacio de pantalla
 */

import { LabelRenderer } from '../../LabelRenderer.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { CanvasPrimitives } from '../../../../core/CanvasPrimitives.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { ModalManager } from '../modules/ModalManager.js';
import { TextRenderer } from './TextRenderer.js';

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
                const bounds = GeometryUtils.getContainerBounds(node, nodes, camera.zoomScale, dropTargetId);
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
                    color: isHovered ? ThemeManager.colors.text : neonColor,
                    bold: true
                });

                if (node.message) {
                    this.drawMessageBadge(ctx, scX + sW / 2 - 15, scY - sH / 2 + 15, node.color);
                }
            } else if (node.isStickyNote) {
                // Render unificado en World Space
            } else {
                // Regular Nodes
                const radius = GeometryUtils.getNodeRadius(node, camera.zoomScale);
                LabelRenderer.drawNodeIcon(ctx, node.icon, screenX, screenY, node.isSatellite, camera.zoomScale, radius);
                LabelRenderer.drawNodeLabel(ctx, node, screenX, screenY, isHovered, camera.zoomScale, radius);

                if (node.message) {
                    const sRadius = radius * camera.zoomScale;
                    this.drawMessageBadge(ctx, screenX + sRadius * 0.7, screenY - sRadius * 0.7, node.color);
                }

                // Tooltip in screen space for better readability
                if (isHovered && node.description) {
                    const radius = (node.isRepoContainer ? 75 : 45) * camera.zoomScale;
                    TextRenderer.drawTooltip(ctx, node.description, screenX + radius, screenY - radius, {
                        bgColor: 'rgba(13, 17, 23, 0.98)',
                        borderColor: node.color || ThemeManager.colors.textDim,
                        textColor: ThemeManager.colors.text,
                        maxWidth: 220,
                        fontSize: 15
                    });
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


};
