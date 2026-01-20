/**
 * PipelineRenderer.js
 * Rendering engine for the Pipeline Visualizer.
 * Refactored to delegate physics and routing to specialized engines.
 */

import { PIPELINE_NODES, CONNECTIONS } from './PipelineConstants.js';
import { PipelineStateManager } from './PipelineStateManager.js';
import { SectorRenderer } from './SectorRenderer.js';
import { LabelRenderer } from './LabelRenderer.js';
import { LayoutEngine } from './LayoutEngine.js';
import { ConnectionRouter } from './ConnectionRouter.js';
import * as LanguageTheme from './LanguageTheme.js';

export const PipelineRenderer = {
    initialized: false,

    /**
     * Clear and update physics
     */
    prepare(ctx, width, height) {
        if (!this.initialized) {
            LayoutEngine.init(width, height);
            this.initialized = true;
        }
        LayoutEngine.update(width, height);
        ctx.clearRect(0, 0, width, height);
    },

    // Draw traveling packages along connections
    drawTravelingPackages(ctx, width, height, packages) {
        if (!packages || packages.length === 0) return;

        packages.forEach(pkg => {
            const startPos = LayoutEngine.getNodePos(pkg.from);
            const endPos = LayoutEngine.getNodePos(pkg.to);
            const path = ConnectionRouter.computeRoute(pkg.from, pkg.to, startPos, endPos);
            const pos = ConnectionRouter.getPointOnPath(path, pkg.progress);
            const color = LanguageTheme.getColorForFile(pkg.file);

            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    },

    // Draw organized highway connections
    drawConnections(ctx, width, height, nodeStats) {
        CONNECTIONS.forEach(conn => {
            const startPos = LayoutEngine.getNodePos(conn.from);
            const endPos = LayoutEngine.getNodePos(conn.to);

            const fromStats = nodeStats[conn.from] || {};
            const isDispatching = fromStats.isDispatching && fromStats.targetNode === conn.to;
            const isReceiving = fromStats.isReceiving && fromStats.sourceNode === conn.from;

            const path = ConnectionRouter.computeRoute(conn.from, conn.to, startPos, endPos);
            ConnectionRouter.drawPath(ctx, path, 'rgba(139, 148, 158, 0.15)', false, isDispatching, isReceiving);
        });
    },

    // Draw pipeline nodes with physics-based positions
    drawNodes(ctx, width, height, nodeStates, nodeStats, hoveredNode, nodeHealth = {}) {
        SectorRenderer.drawWorkerSector(ctx, width, height, nodeStates);
        SectorRenderer.drawCpuSector(ctx, width, height, nodeStates);
        SectorRenderer.drawCacheContainer(ctx, width, height, nodeStates, nodeStats);

        Object.entries(PIPELINE_NODES).forEach(([id, node]) => {
            if (node.isRepoContainer || (node.isDynamic && node.hidden)) return;

            const pos = LayoutEngine.getNodePos(id);
            const isHovered = hoveredNode === id;
            const x = pos.x;
            const y = pos.y;

            if (node.isSatellite && node.orbitParent) {
                const parentPos = LayoutEngine.getNodePos(node.orbitParent);
                LabelRenderer.drawSatellite(ctx, node, parentPos.x, parentPos.y, isHovered);
                return;
            }

            const state = nodeStates[id] || 'idle';
            const stats = nodeStats[id] || { count: 0 };
            const isSlot = id.startsWith('worker_') && id !== 'workers_hub';
            const radius = (isHovered ? 38 : 35);

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
            ctx.strokeStyle = state === 'active' ? node.activeColor : node.color;
            ctx.lineWidth = isHovered ? 3 : 2;

            if (isSlot) {
                if (ctx.roundRect) ctx.roundRect(x - 25, y - 25, 50, 50, 8);
                else ctx.rect(x - 25, y - 25, 50, 50);
            } else {
                ctx.arc(x, y, radius, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            LabelRenderer.drawNodeLabel(ctx, node, x, y, isHovered);
            LabelRenderer.drawNodeIcon(ctx, node.icon, x, y, false);

            if (stats.count > 0) {
                LabelRenderer.drawBadge(ctx, stats.count.toString(), x + 25, y - 25, node.activeColor);
            }
        });
    },

    drawParticles(ctx, particles) {
        if (!particles || particles.length === 0) return;

        const now = Date.now();
        particles.forEach(p => {
            const elapsed = now - p.startTime;
            const t = Math.min(1, elapsed / p.duration);

            // Linear interpolation
            const x = p.fromX + (p.toX - p.fromX) * t;
            const y = p.fromY + (p.toY - p.fromY) * t;

            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 1 - t; // Fade out
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    },

    drawSelectionGlow(ctx, width, height, selectedNode) {
        const pos = LayoutEngine.getNodePos(selectedNode);
        if (!pos) return;
        ctx.beginPath();
        ctx.strokeStyle = '#FFFFFF';
        ctx.setLineDash([2, 4]);
        ctx.arc(pos.x, pos.y, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    drawTooltip(ctx, width, height, hoveredNode, nodeStats) {
        const node = PIPELINE_NODES[hoveredNode];
        const pos = LayoutEngine.getNodePos(hoveredNode);
        if (!node || !pos) return;
        LabelRenderer.drawStandardText(ctx, `${node.label}: ${nodeStats[hoveredNode]?.count || 0}`, pos.x + 50, pos.y - 30, { fontSize: 12, color: '#e6edf3', align: 'left' });
    },

    /**
     * Draw location pings (ripples)
     */
    drawPulses(ctx, pulses) {
        if (!pulses || pulses.length === 0) return;

        const now = Date.now();
        pulses.forEach(p => {
            const pos = LayoutEngine.getNodePos(p.nodeId);
            const elapsed = now - p.startTime;
            const t = Math.min(1, elapsed / p.duration);

            const radius = 35 + (t * 60); // Expands from 35 to 95
            const opacity = 1 - t;

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 2;
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    }
};
