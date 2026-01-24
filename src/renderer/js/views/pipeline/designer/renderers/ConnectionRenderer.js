import { DesignerCanvas } from '../DesignerCanvas.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';
import { GeometryUtils } from '../GeometryUtils.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export const ConnectionRenderer = {
    /**
     * Draw manual connections between nodes
     */
    render(ctx, nodes, camera, connections, activeConnection = null, selectedConnectionId = null) {
        if (!connections || !Array.isArray(connections)) return;

        // LEVEL 3: Per-connection error boundary
        connections.forEach(conn => {
            try {
                const startNode = nodes[conn.from];
                const endNode = nodes[conn.to];
                if (startNode && endNode) {
                    const connId = conn.id || `${conn.from}-${conn.to}`;
                    const isSelected = connId === selectedConnectionId;
                    this.drawSimpleLine(ctx, startNode, endNode, camera, nodes, isSelected);
                }
            } catch (e) {
                console.warn(`[ConnectionRenderer] Failed to render connection ${conn?.from}→${conn?.to}:`, e.message);
                // Continue to next connection
            }
        });

        // Draw active connection line if present
        if (activeConnection) {
            try {
                this.drawActiveLine(ctx, activeConnection.fromNode, activeConnection.currentPos, camera);
            } catch (e) {
                console.warn('[ConnectionRenderer] Failed to render active connection:', e.message);
            }
        }
    },

    /**
     * Draw a persistent manual connection between two nodes
     */
    drawSimpleLine(ctx, fromNode, toNode, camera, nodes, isSelected = false) {
        ctx.save(); // CRITICAL: Isolate state changes

        // Get edge points for both nodes (handles circles and rectangles)
        const startPoint = DesignerCanvas.getEdgePoint(fromNode, toNode.x, toNode.y, nodes, camera);
        const endPoint = DesignerCanvas.getEdgePoint(toNode, fromNode.x, fromNode.y, nodes, camera);

        const angle = GeometryUtils.calculateAngle(startPoint, endPoint);

        ctx.beginPath();
        ctx.strokeStyle = isSelected ? ThemeManager.colors.connectionActive : ThemeManager.colors.connection;
        ctx.lineWidth = isSelected ? DESIGNER_CONSTANTS.VISUAL.BORDER.CONNECTION_SELECTED : DESIGNER_CONSTANTS.VISUAL.BORDER.CONNECTION_DEFAULT;
        ctx.globalAlpha = isSelected ? DESIGNER_CONSTANTS.VISUAL.OPACITY.DEFAULT : DESIGNER_CONSTANTS.VISUAL.OPACITY.CONNECTION_DEFAULT;

        // Neon Glow for connections
        ctx.shadowBlur = isSelected ? ThemeManager.effects.shadow.glow.blur * 1.5 : ThemeManager.effects.shadow.glow.blur;
        ctx.shadowColor = isSelected ? ThemeManager.colors.connectionActive : ThemeManager.colors.connection;

        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        // Arrow head
        const arrowGeom = ThemeManager.geometry.arrow;
        const arrowPoints = GeometryUtils.calculateArrowPoints(endPoint, angle, arrowGeom.headLength, arrowGeom.angle);

        ctx.beginPath();
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(arrowPoints[0].x, arrowPoints[0].y);
        ctx.lineTo(arrowPoints[1].x, arrowPoints[1].y);
        ctx.closePath();
        ctx.fillStyle = isSelected ? ThemeManager.colors.connectionActive : ThemeManager.colors.connection;
        ctx.fill();

        ctx.restore(); // CRITICAL
    },

    /**
     * Draw the "ghost" line while the user is actively drawing a connection
     */
    drawActiveLine(ctx, fromNode, mouseWorldPos, camera) {
        ctx.save();

        const angle = GeometryUtils.calculateAngle(fromNode, mouseWorldPos);
        const nodeGeom = ThemeManager.geometry.node;
        const radius = fromNode.isSatellite ? nodeGeom.satelliteRadius : nodeGeom.defaultRadius;
        const pos = GeometryUtils.calculateOrbitPosition(fromNode, radius, angle * (180 / Math.PI));
        const startX = pos.x;
        const startY = pos.y;

        const { CONNECTION } = DESIGNER_CONSTANTS.VISUAL;
        ctx.beginPath();
        ctx.strokeStyle = ThemeManager.colors.primary;
        ctx.lineWidth = CONNECTION.ACTIVE_WIDTH;
        ctx.setLineDash(CONNECTION.DASH_PATTERN);
        ctx.globalAlpha = DESIGNER_CONSTANTS.VISUAL.OPACITY.ACTIVE_LINE;

        ctx.moveTo(startX, startY);
        ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
        ctx.stroke();

        ctx.restore();
    }
};
