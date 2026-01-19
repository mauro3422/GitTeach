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
    /**
     * Draw traveling packages along connections
     */
    drawTravelingPackages(ctx, width, height, packages, panOffset) {
        if (!packages || packages.length === 0) return;

        packages.forEach(pkg => {
            const fromNode = PIPELINE_NODES[pkg.fromId];
            const toNode = PIPELINE_NODES[pkg.toId];
            if (!fromNode || !toNode) return;

            const startX = fromNode.x * width + panOffset.x;
            const startY = fromNode.y * height + panOffset.y;
            const endX = toNode.x * width + panOffset.x;
            const endY = toNode.y * height + panOffset.y;

            // Linear interpolation
            const x = startX + (endX - startX) * pkg.progress;
            const y = startY + (endY - startY) * pkg.progress;

            // Draw package (small glowing box)
            const size = 6;
            ctx.shadowColor = pkg.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = pkg.color;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x - size / 2, y - size / 2, size, size, 1);
            } else {
                ctx.rect(x - size / 2, y - size / 2, size, size);
            }
            ctx.fill();

            ctx.shadowBlur = 0;
        });
    },

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
    drawNodes(ctx, width, height, panOffset, nodeStates, nodeStats, hoveredNode, nodeHealth = {}) {
        // Draw Worker Sector background
        this.drawWorkerSector(ctx, width, height, panOffset);

        Object.entries(PIPELINE_NODES).forEach(([id, node]) => {
            const state = nodeStates[id] || 'idle';
            const stats = nodeStats[id] || { count: 0 };
            const isOnline = nodeHealth[id] !== false; // Default to true if not present
            const x = (node.x * width) + panOffset.x;
            const y = (node.y * height) + panOffset.y;
            const isHovered = hoveredNode === id;

            // Define styles based on state and health
            let borderColor = isOnline ? node.color : '#ff4444';
            let glowColor = null;
            let bgColor = isOnline ? 'rgba(22, 27, 34, 0.9)' : 'rgba(40, 40, 40, 0.8)';
            let pulseScale = 1;

            if (!isOnline) {
                borderColor = '#ff4444';
                pulseScale = 0.95; // Slightly collapsed
            } else if (state === 'active') {
                borderColor = node.activeColor;
                glowColor = node.activeColor;
                pulseScale = 1 + Math.sin(Date.now() / 200) * 0.05;
            } else if (state === 'pending') {
                borderColor = '#3fb950'; // Solid green
                glowColor = 'rgba(63, 185, 80, 0.3)'; // Faint, non-pulsing glow
                pulseScale = 1; // No pulse for pending
            } else if (state === 'error') {
                borderColor = '#ff7b72';
                glowColor = '#ff7b72';
                bgColor = 'rgba(255, 123, 114, 0.1)';
            }

            const isSlot = id.startsWith('worker_') && id !== 'workers_hub';
            const radius = (isHovered ? 38 : 35) * pulseScale;

            if (glowColor) {
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = isSlot ? 25 * pulseScale : 15 * pulseScale;
            }

            // Draw node circle or slot

            if (isSlot) {
                const size = 50 * pulseScale; // Reduced size from 60 to 50
                ctx.beginPath();
                ctx.fillStyle = bgColor;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = isHovered ? 3 : 2;
                if (ctx.roundRect) {
                    ctx.roundRect(x - size / 2, y - size / 2, size, size, 8);
                } else {
                    ctx.rect(x - size / 2, y - size / 2, size, size);
                }
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.fillStyle = bgColor;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = isHovered ? 3 : 2;
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Draw icon
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.icon, x, y - 5);

            // [NEW] Hardware Fault Indicator
            if (!isOnline) {
                ctx.save();
                ctx.translate(x + 15, y - 15);
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#da3633'; // GitHub Error Red
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.font = 'bold 10px var(--font-mono)';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('!', 0, 0);

                // Text label for clarity
                ctx.font = 'bold 9px var(--font-mono)';
                ctx.fillStyle = '#da3633';
                ctx.textAlign = 'left';
                ctx.fillText('OFFLINE', 12, 0);
                ctx.restore();
            }

            // Compact labels for slots - Use dynamic label if available
            ctx.font = isSlot ? '8.5px var(--font-mono), monospace' : 'bold 10px var(--font-mono), monospace';
            ctx.fillStyle = (state === 'active' || state === 'pending') ? '#56d364' : '#8b949e';

            const labelYOffset = isSlot ? 35 : 50;
            const displayLabel = (isSlot && stats.currentLabel) ? stats.currentLabel : node.label;

            // If label is too long, truncate for slots
            const finalLabel = (isSlot && displayLabel.length > 30)
                ? '...' + displayLabel.slice(-27)
                : displayLabel;

            ctx.fillText(finalLabel, x, y + labelYOffset);

            // Draw sublabel (only if not a slot to keep it clean)
            if (node.sublabel && !isSlot) {
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
    },

    /**
     * Draw a background sector for worker slots
     */
    drawWorkerSector(ctx, width, height, panOffset) {
        const x = (0.45 * width) + panOffset.x;
        const y = (0.25 * height) + panOffset.y;
        const w = 110; // Slightly narrower
        const h = 340;

        ctx.save();
        // Subtle glow for the cluster
        ctx.shadowColor = 'rgba(35, 134, 54, 0.2)';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(22, 27, 34, 0.4)'; // Darker translucent background
        ctx.strokeStyle = 'rgba(35, 134, 54, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([15, 8]);
        ctx.roundRect(x - w / 2, y - h / 2, w, h, 20);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.setLineDash([]);

        // Sector Title and Subtitle
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px var(--font-mono), monospace';
        ctx.fillStyle = 'rgba(56, 139, 253, 0.9)';
        ctx.fillText('GPU_EXECUTION_CLUSTER', x, y - h / 2 + 18);

        ctx.font = '7px var(--font-mono), monospace';
        ctx.fillStyle = 'rgba(35, 134, 54, 0.7)';
        ctx.fillText('NVIDIA_CUDA_CORE_ACTIVE', x, y + h / 2 - 12);
    }
};
