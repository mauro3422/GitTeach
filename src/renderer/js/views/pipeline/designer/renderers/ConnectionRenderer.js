/**
 * ConnectionRenderer.js
 * Responsabilidad: Renderizado de conexiones entre nodos
 */

import { DesignerCanvas } from '../DesignerCanvas.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

export const ConnectionRenderer = {
    /**
     * Draw manual connections between nodes
     */
    render(ctx, nodes, camera, connections, activeConnection = null) {
        if (!connections || !Array.isArray(connections)) return;

        connections.forEach(conn => {
            const startNode = nodes[conn.from];
            const endNode = nodes[conn.to];
            if (startNode && endNode) {
                this.drawSimpleLine(ctx, startNode, endNode, camera, nodes);
            }
        });

        // Draw active connection line if present
        if (activeConnection) {
            this.drawActiveLine(ctx, activeConnection.fromNode, activeConnection.currentPos, camera);
        }
    },

    /**
     * Draw a persistent manual connection between two nodes
     */
    drawSimpleLine(ctx, fromNode, toNode, camera, nodes) {
        ctx.save(); // CRITICAL: Isolate state changes

        // Get edge points for both nodes (handles circles and rectangles)
        const startPoint = DesignerCanvas.getEdgePoint(fromNode, toNode.x, toNode.y, nodes, camera);
        const endPoint = DesignerCanvas.getEdgePoint(toNode, fromNode.x, fromNode.y, nodes, camera);

        const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

        ctx.beginPath();
        ctx.strokeStyle = ThemeManager.colors.connection;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.9;

        // Neon Glow for connections
        ctx.shadowBlur = 8;
        ctx.shadowColor = ThemeManager.colors.connection;

        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        // Arrow head
        const headlen = 10;
        ctx.beginPath(); // New path for arrow
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle - Math.PI / 6), endPoint.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle + Math.PI / 6), endPoint.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = ThemeManager.colors.connection;
        ctx.fill();

        ctx.restore(); // CRITICAL
    },

    /**
     * Draw the "ghost" line while the user is actively drawing a connection
     */
    drawActiveLine(ctx, fromNode, mouseWorldPos, camera) {
        ctx.save();

        const angle = Math.atan2(mouseWorldPos.y - fromNode.y, mouseWorldPos.x - fromNode.x);
        const fromRadius = fromNode.isSatellite ? 25 : 35;
        const startX = fromNode.x + fromRadius * Math.cos(angle);
        const startY = fromNode.y + fromRadius * Math.sin(angle);

        ctx.beginPath();
        ctx.strokeStyle = ThemeManager.colors.primary;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.7;

        ctx.moveTo(startX, startY);
        ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
        ctx.stroke();

        ctx.restore();
    }
};
