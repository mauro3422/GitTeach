import { LabelRenderer } from '../LabelRenderer.js';

export const DesignerCanvas = {
    ctx: null,

    init(ctx) {
        this.ctx = ctx;
    },

    drawGrid(width, height, navState) {
        const ctx = this.ctx;
        const { panOffset, zoomScale } = navState;
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoomScale, zoomScale);
        ctx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
        ctx.lineWidth = 1 / zoomScale;
        const size = 100;
        const startX = -Math.floor(panOffset.x / zoomScale / size) * size - size * 10;
        const endX = startX + (width / zoomScale) + size * 20;
        const startY = -Math.floor(panOffset.y / zoomScale / size) * size - size * 10;
        const endY = startY + (height / zoomScale) + size * 20;
        for (let x = startX; x <= endX; x += size) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += size) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }
        ctx.restore();
    },

    /**
     * Draw a persistent manual connection between two nodes
     */
    drawSimpleLine(fromNode, toNode, navState) {
        const ctx = this.ctx;
        const color = '#8b949e';

        ctx.save();
        ctx.translate(navState.panOffset.x, navState.panOffset.y);
        ctx.scale(navState.zoomScale, navState.zoomScale);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;

        // Simple straight line from center to center for now
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const headlen = 10;
        const toX = toNode.x - 35 * Math.cos(angle); // Offset for node radius
        const toY = toNode.y - 35 * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw the "ghost" line while the user is actively drawing a connection
     */
    drawActiveLine(fromNode, mouseWorldPos, navState) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(navState.panOffset.x, navState.panOffset.y);
        ctx.scale(navState.zoomScale, navState.zoomScale);

        ctx.beginPath();
        ctx.strokeStyle = '#2f81f7';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
        ctx.stroke();

        ctx.restore();
    },

    drawNodes(nodes, navState) {
        const ctx = this.ctx;
        const { panOffset, zoomScale } = navState;
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoomScale, zoomScale);
        Object.values(nodes).forEach(node => {
            const { x, y, color, icon, label, isSatellite } = node;
            const radius = isSatellite ? 25 : 35;
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            if (node.isDragging) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.lineWidth = 3;
            }
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            LabelRenderer.drawNodeIcon(ctx, icon, x, y, false);
            LabelRenderer.drawNodeLabel(ctx, node, x, y, false);
        });
        ctx.restore();
    }
};
