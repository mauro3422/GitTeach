/**
 * SectorRenderer.js
 * Specialized renderer for background sectors and containers (GPU, CPU, Cache).
 * Extracted from PipelineRenderer to maintain modularity.
 */
import { PIPELINE_NODES } from './PipelineConstants.js';
import { PipelineStateManager } from './PipelineStateManager.js';
import { LabelRenderer } from './LabelRenderer.js';

export const SectorRenderer = {
    /**
     * Draw a background sector for worker slots (GPU Cluster)
     */
    drawWorkerSector(ctx, width, height, panOffset) {
        // Mathematical bounds: xHub=0.72, xSlots=0.90
        const xHub = (0.72 * width) + panOffset.x;
        const xSlots = (0.90 * width) + panOffset.x;
        const centerX = (xHub + xSlots) / 2;
        const y = (0.50 * height) + panOffset.y;

        const w = (xSlots - xHub) + 140;
        const h = 340; // Covers Embeddings (0.30) to worker_3 (0.62)

        ctx.save();
        ctx.shadowColor = 'rgba(35, 134, 54, 0.2)';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(22, 27, 34, 0.4)';
        ctx.strokeStyle = 'rgba(35, 134, 54, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([15, 8]);
        if (ctx.roundRect) {
            ctx.roundRect(centerX - w / 2, y - h / 2, w, h, 20);
        } else {
            ctx.rect(centerX - w / 2, y - h / 2, w, h);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.setLineDash([]);

        // Sector Title (DELEGATED)
        LabelRenderer.drawSectorTitle(
            ctx,
            'GPU_EXECUTION_CLUSTER',
            'CUDA_ACTIVE | PORT 8000 + 8001',
            centerX,
            y - h / 2,
            y + h / 2,
            'rgba(56, 139, 253, 0.9)'
        );
    },

    /**
     * Draw a background sector for CPU mappers
     */
    drawCpuSector(ctx, width, height, panOffset) {
        // Mathematical center: 1.30
        const x = (1.30 * width) + panOffset.x;
        const y = (0.50 * height) + panOffset.y;
        const w = 160;
        const h = 340;

        ctx.save();
        ctx.shadowColor = 'rgba(241, 126, 23, 0.1)';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(22, 27, 34, 0.4)';
        ctx.strokeStyle = 'rgba(241, 126, 23, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 5]);
        if (ctx.roundRect) {
            ctx.roundRect(x - w / 2, y - h / 2, w, h, 20);
        } else {
            ctx.rect(x - w / 2, y - h / 2, w, h);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.setLineDash([]);

        // Sector Title (DELEGATED)
        LabelRenderer.drawSectorTitle(
            ctx,
            'CPU_MAPPER_CLUSTER',
            'PARALLEL_DOMAINS | PORT 8002',
            x,
            y - h / 2,
            y + h / 2,
            'rgba(241, 126, 23, 0.9)'
        );
    },

    /**
     * Draw Cache Store as a CONTAINER for repository nodes
     */
    drawCacheContainer(ctx, width, height, panOffset, nodeStates, nodeStats) {
        const activeSlots = PipelineStateManager.getActiveRepoSlots();
        const cacheNode = PIPELINE_NODES.cache;

        const repoCount = Math.max(1, activeSlots.length);
        const cols = Math.ceil(Math.sqrt(repoCount));
        const rows = Math.ceil(repoCount / cols);

        const nodeW = 68;
        const nodeH = 34;
        const gapX = 6;
        const gapY = 5;

        // Container dimensions
        const containerW = Math.max(140, cols * (nodeW + gapX) + 40);
        const containerH = Math.max(100, rows * (nodeH + gapY) + 60);

        const centerX = (cacheNode.x * width) + panOffset.x;
        const centerY = (cacheNode.y * height) + panOffset.y;
        const x = centerX - containerW / 2;
        const y = centerY - containerH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(63, 185, 80, 0.3)';
        ctx.shadowBlur = 25;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(13, 17, 23, 0.92)';
        ctx.strokeStyle = activeSlots.length > 0 ? 'rgba(63, 185, 80, 0.6)' : 'rgba(139, 148, 158, 0.4)';
        ctx.lineWidth = 2;
        if (ctx.roundRect) {
            ctx.roundRect(x, y, containerW, containerH, 12);
        } else {
            ctx.rect(x, y, containerW, containerH);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Cache Title (DELEGATED)
        LabelRenderer.drawStandardText(ctx, '💾', centerX, y + 22, { fontSize: 18 });
        LabelRenderer.drawStandardText(ctx, 'CACHE STORE', centerX, y + 38, {
            fontSize: 10,
            color: activeSlots.length > 0 ? '#3fb950' : '#8b949e',
            bold: true
        });
    }
};
