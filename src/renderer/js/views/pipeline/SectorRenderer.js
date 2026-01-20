/**
 * SectorRenderer.js
 * Specialized renderer for background sectors and containers (GPU, CPU, Cache).
 * Extracted from PipelineRenderer to maintain modularity.
 */
import { PIPELINE_NODES } from './PipelineConstants.js';
import { PipelineStateManager } from './PipelineStateManager.js';
import { LabelRenderer } from './LabelRenderer.js';
import { LayoutEngine } from './LayoutEngine.js';

export const SectorRenderer = {
    /**
     * Draw a background sector for worker slots (GPU Cluster)
     */
    drawWorkerSector(ctx, width, height, nodeStates = {}) {
        const hubPos = LayoutEngine.getNodePos('workers_hub');
        const slot1Pos = LayoutEngine.getNodePos('worker_1');
        const slot3Pos = LayoutEngine.getNodePos('worker_3');
        const embPos = LayoutEngine.getNodePos('embedding_server');

        // Dynamic Bounding Box
        const nodes = [hubPos, slot1Pos, slot3Pos, embPos];
        const minX = Math.min(...nodes.map(p => p.x)) - 60;
        const maxX = Math.max(...nodes.map(p => p.x)) + 80;
        const minY = Math.min(...nodes.map(p => p.y)) - 60;
        const maxY = Math.max(...nodes.map(p => p.y)) + 60;

        const w = maxX - minX;
        const h = maxY - minY;
        const centerX = minX + w / 2;
        const centerY = minY + h / 2;

        const isActive = Object.keys(nodeStates).some(id =>
            (id === 'workers_hub' || id === 'embedding_server' || id.startsWith('worker_')) &&
            nodeStates[id] === 'active'
        );

        ctx.save();
        ctx.shadowColor = isActive ? 'rgba(35, 134, 54, 0.4)' : 'rgba(35, 134, 54, 0.1)';
        ctx.shadowBlur = isActive ? 30 : 10;

        ctx.beginPath();
        ctx.fillStyle = isActive ? 'rgba(22, 27, 34, 0.6)' : 'rgba(22, 27, 34, 0.3)';
        ctx.strokeStyle = isActive ? 'rgba(35, 134, 54, 0.6)' : 'rgba(35, 134, 54, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([15, 8]);
        if (ctx.roundRect) {
            ctx.roundRect(minX, minY, w, h, 20);
        } else {
            ctx.rect(minX, minY, w, h);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.setLineDash([]);

        LabelRenderer.drawSectorTitle(
            ctx,
            'GPU_EXECUTION_CLUSTER',
            'CUDA_ACTIVE | PORT 8000 + 8001',
            centerX,
            minY,
            maxY,
            'rgba(56, 139, 253, 0.9)'
        );
    },

    /**
     * Draw a background sector for CPU mappers
     */
    drawCpuSector(ctx, width, height, nodeStates = {}) {
        const m1 = LayoutEngine.getNodePos('mapper_architecture');
        const m2 = LayoutEngine.getNodePos('mapper_habits');
        const m3 = LayoutEngine.getNodePos('mapper_stack');

        const nodes = [m1, m2, m3];
        const minX = Math.min(...nodes.map(p => p.x)) - 80;
        const maxX = Math.max(...nodes.map(p => p.x)) + 80;
        const minY = Math.min(...nodes.map(p => p.y)) - 60;
        const maxY = Math.max(...nodes.map(p => p.y)) + 60;

        const w = maxX - minX;
        const h = maxY - minY;
        const centerX = minX + w / 2;
        const centerY = minY + h / 2;

        const isActive = Object.keys(nodeStates).some(id =>
            id.startsWith('mapper_') && nodeStates[id] === 'active'
        );

        ctx.save();
        ctx.shadowColor = isActive ? 'rgba(241, 126, 23, 0.3)' : 'rgba(241, 126, 23, 0.05)';
        ctx.shadowBlur = isActive ? 30 : 10;

        ctx.beginPath();
        ctx.fillStyle = isActive ? 'rgba(22, 27, 34, 0.6)' : 'rgba(22, 27, 34, 0.3)';
        ctx.strokeStyle = isActive ? 'rgba(241, 126, 23, 0.5)' : 'rgba(241, 126, 23, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 5]);
        if (ctx.roundRect) {
            ctx.roundRect(minX, minY, w, h, 20);
        } else {
            ctx.rect(minX, minY, w, h);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.setLineDash([]);

        LabelRenderer.drawSectorTitle(
            ctx,
            'CPU_MAPPER_CLUSTER',
            'PARALLEL_DOMAINS | PORT 8002',
            centerX,
            minY,
            maxY,
            'rgba(241, 126, 23, 0.9)'
        );
    },

    /**
     * Draw Cache Store as a CONTAINER for repository nodes
     */
    drawCacheContainer(ctx, width, height, nodeStates, nodeStats) {
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

        const centerX = LayoutEngine.getNodePos('cache').x;
        const centerY = LayoutEngine.getNodePos('cache').y;
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
