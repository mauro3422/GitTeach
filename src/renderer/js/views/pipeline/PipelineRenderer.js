/**
 * PipelineRenderer.js
 * Rendering engine for the Pipeline Visualizer.
 * Handles all draw calls to the canvas.
 */

import { PIPELINE_NODES, CONNECTIONS } from './PipelineConstants.js';

export const PipelineRenderer = {
    /**
     * Clear the canvas
     */
    clear(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
    },

    /**
     * Draw connections between nodes
     */
    drawConnections(ctx, width, height, panOffset) {
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;

        CONNECTIONS.forEach(conn => {
            const from = PIPELINE_NODES[conn.from];
            const to = PIPELINE_NODES[conn.to];

            if (!from || !to) return;

            const x1 = (from.x * width) + panOffset.x;
            const y1 = (from.y * height) + panOffset.y;
            const x2 = (to.x * width) + panOffset.x;
            const y2 = (to.y * height) + panOffset.y;

            // Gradient line
            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0, 'rgba(35, 134, 54, 0.2)');
            grad.addColorStop(1, 'rgba(35, 134, 54, 0.5)');

            ctx.beginPath();
            ctx.strokeStyle = grad;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });

        ctx.setLineDash([]);

        // Draw arrow heads
        CONNECTIONS.forEach(conn => {
            const from = PIPELINE_NODES[conn.from];
            const to = PIPELINE_NODES[conn.to];

            if (!from || !to) return;

            const x1 = (from.x * width) + panOffset.x;
            const y1 = (from.y * height) + panOffset.y;
            const x2 = (to.x * width) + panOffset.x;
            const y2 = (to.y * height) + panOffset.y;

            const angle = Math.atan2(y2 - y1, x2 - x1);
            const arrowLen = 10;
            const arrowX = x2 - 30 * Math.cos(angle);
            const arrowY = y2 - 30 * Math.sin(angle);

            ctx.beginPath();
            ctx.fillStyle = 'rgba(35, 134, 54, 0.5)';
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
                arrowX - arrowLen * Math.cos(angle - Math.PI / 6),
                arrowY - arrowLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                arrowX - arrowLen * Math.cos(angle + Math.PI / 6),
                arrowY - arrowLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        });
    },

    /**
     * Draw animated particles
     */
    drawParticles(ctx, particles, panOffset) {
        const now = Date.now();

        // Note: Filter should be done by the controller to manage state, 
        // but drawing is here. For SOLID, we return the filtered list or just draw.
        // Let's just draw what's valid.
        particles.forEach(p => {
            const elapsed = now - p.startTime;
            const progress = elapsed / p.duration;

            if (progress >= 1) return;

            const x = (p.fromX + (p.toX - p.fromX) * progress) + panOffset.x;
            const y = (p.fromY + (p.toY - p.fromY) * progress) + panOffset.y;

            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    },

    /**
     * Draw pipeline nodes
     */
    drawNodes(ctx, width, height, panOffset, nodeStates, nodeStats, hoveredNode) {
        Object.entries(PIPELINE_NODES).forEach(([id, node]) => {
            const state = nodeStates[id] || 'idle';
            const stats = nodeStats[id] || { count: 0 };
            const x = (node.x * width) + panOffset.x;
            const y = (node.y * height) + panOffset.y;
            const isHovered = hoveredNode === id;

            // Define styles based on state
            let borderColor = node.color;
            let glowColor = null;
            let bgColor = 'rgba(22, 27, 34, 0.9)';
            let pulseScale = 1;

            if (state === 'active') {
                borderColor = node.activeColor;
                glowColor = node.activeColor;
                pulseScale = 1 + Math.sin(Date.now() / 200) * 0.05;
            } else if (state === 'error') {
                borderColor = '#ff7b72';
                glowColor = '#ff7b72';
                bgColor = 'rgba(255, 123, 114, 0.1)';
            }

            if (glowColor) {
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 15 * pulseScale;
            }

            // Draw node circle
            const radius = (isHovered ? 38 : 35) * pulseScale;
            ctx.beginPath();
            ctx.fillStyle = bgColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw icon
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.icon, x, y - 5);

            // Draw label below
            ctx.font = 'bold 10px var(--font-mono), monospace';
            ctx.fillStyle = '#e6edf3';
            ctx.fillText(node.label, x, y + 50);

            // Draw sublabel
            if (node.sublabel) {
                ctx.font = '8px var(--font-mono), monospace';
                ctx.fillStyle = '#8b949e';
                ctx.fillText(node.sublabel, x, y + 62);
            }

            // Draw count badge if > 0
            if (stats.count > 0) {
                ctx.beginPath();
                ctx.fillStyle = node.activeColor;
                ctx.arc(x + 25, y - 25, 12, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#0d1117';
                ctx.fillText(stats.count.toString(), x + 25, y - 25);
            }
        });
    },

    /**
     * Draw glow around selected node
     */
    drawSelectionGlow(ctx, width, height, panOffset, selectedNode) {
        const node = PIPELINE_NODES[selectedNode];
        if (!node) return;

        const x = (node.x * width) + panOffset.x;
        const y = (node.y * height) + panOffset.y;

        ctx.beginPath();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.arc(x, y, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    /**
     * Draw tooltip for hovered node
     */
    drawTooltip(ctx, width, height, panOffset, hoveredNode, nodeStats) {
        const node = PIPELINE_NODES[hoveredNode];
        const stats = nodeStats[hoveredNode];

        if (!node || !stats) return;

        const text = `${node.label}: ${stats.count} events`;
        const lastEvent = stats.lastEvent ? `Last: ${stats.lastEvent}` : '';

        const x = (node.x * width) + panOffset.x + 50;
        const y = (node.y * height) + panOffset.y - 30;
        const padding = 10;

        ctx.font = '12px var(--font-mono), monospace';
        const textWidth = Math.max(ctx.measureText(text).width, ctx.measureText(lastEvent).width);

        // Draw tooltip background
        ctx.fillStyle = 'rgba(22, 27, 34, 0.95)';
        ctx.strokeStyle = 'rgba(35, 134, 54, 0.5)';
        ctx.beginPath();
        ctx.roundRect(x - padding, y - padding, textWidth + padding * 2, lastEvent ? 44 : 24, 6);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#e6edf3';
        ctx.textAlign = 'left';
        ctx.fillText(text, x, y + 4);

        if (lastEvent) {
            ctx.fillStyle = '#8b949e';
            ctx.fillText(lastEvent, x, y + 22);
        }
    }
};
