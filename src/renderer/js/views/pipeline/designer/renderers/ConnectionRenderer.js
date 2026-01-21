/**
 * ConnectionRenderer.js
 * Responsabilidad: Renderizado de conexiones entre nodos
 */

import { DesignerCanvas } from '../DesignerCanvas.js';

export const ConnectionRenderer = {
    /**
     * Draw manual connections between nodes
     */
    render(ctx, nodes, navState, connections) {
        const { panOffset, zoomScale } = navState;
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoomScale, zoomScale);

        connections.forEach(conn => {
            const startNode = nodes[conn.from];
            const endNode = nodes[conn.to];
            if (startNode && endNode) {
                DesignerCanvas.drawSimpleLine(startNode, endNode, navState, nodes);
            }
        });

        ctx.restore();
    }
};
