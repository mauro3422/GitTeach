/**
 * PipelineEventHandler.js
 * Handles pipeline events and visual state transitions.
 * Logic for handover and coordination between nodes.
 */

import { PIPELINE_NODES, EVENT_NODE_MAP } from './PipelineConstants.js';
import { PipelineStateManager } from './PipelineStateManager.js';

export const PipelineEventHandler = {
    /**
     * Main event entry point
     */
    handleEvent(entry, spawnParticles, spawnTravelingPackage) {
        const { type, payload } = entry;
        const nodeId = this.findNodeForEvent(type);
        if (!nodeId) return null;

        const status = payload?.status;
        const repo = payload?.repo || 'System';
        const file = payload?.file || 'Task Processed';

        const stats = PipelineStateManager.nodeStats[nodeId];
        const states = PipelineStateManager.nodeStates;

        // 1. IDEMPOTENCY CHECK
        const isRedundantStart = (status === 'start' &&
            stats.repo === repo &&
            stats.file === file &&
            states[nodeId] === 'active');

        if (isRedundantStart) return { nodeId, redundant: true };

        // 2. CORE LOGIC
        if (status === 'start') {
            stats.isWaiting = false;
            this.handleHandover(nodeId, payload, spawnTravelingPackage);
            states[nodeId] = 'active';
            stats.count++;

            if (nodeId.startsWith('worker_')) {
                stats.currentLabel = `${repo}/${file}`;
                stats.repo = repo;
                stats.file = file;
            }

            PipelineStateManager.addHistoryEntry(nodeId, repo, file, false);

        } else if (status === 'waiting') {
            stats.isWaiting = true;
            states[nodeId] = 'idle';

        } else if (status === 'dispatching') {
            states[nodeId] = 'active';
            stats.isDispatching = true;
            spawnParticles(nodeId, '#388bfd');

            setTimeout(() => {
                if (PipelineStateManager.nodeStats[nodeId]) {
                    PipelineStateManager.nodeStats[nodeId].isDispatching = false;
                }
            }, 1500);

        } else if (status === 'receiving') {
            stats.isDispatching = false;
            stats.isReceiving = true;
            spawnParticles(nodeId, '#56d364');

            setTimeout(() => {
                if (PipelineStateManager.nodeStats[nodeId]) {
                    PipelineStateManager.nodeStats[nodeId].isReceiving = false;
                }
            }, 1500);

        } else if (status === 'end') {
            stats.isWaiting = false;
            stats.isDispatching = false;
            stats.isPendingHandover = true;
            stats.lastProcessedRepo = stats.repo;
            stats.lastProcessedFile = stats.file;
            states[nodeId] = 'pending';
            stats.count = Math.max(0, stats.count - 1);

            PipelineStateManager.markHistoryDone(nodeId, repo, file);

        } else {
            // One-shot
            stats.isWaiting = false;
            this.handleHandover(nodeId, payload, spawnTravelingPackage);
            states[nodeId] = 'active';
            stats.count++;

            const isSlot = nodeId.startsWith('worker_') && nodeId !== 'workers_hub';
            if (!stats.isBuffer && !isSlot) {
                setTimeout(() => {
                    stats.count = Math.max(0, stats.count - 1);
                    if (stats.count === 0) states[nodeId] = 'idle';
                }, 2000);
            }

            PipelineStateManager.addHistoryEntry(nodeId, repo, file, true);
        }

        stats.lastEvent = type;
        return { nodeId, status };
    },

    /**
     * Find node assigned to a specific event type
     */
    findNodeForEvent(event) {
        for (const [prefix, nodeId] of Object.entries(EVENT_NODE_MAP)) {
            if (event.startsWith(prefix)) return nodeId;
        }
        return null;
    },

    /**
     * Manage handover between nodes
     */
    handleHandover(targetNodeId, payload, spawnTravelingPackage) {
        const predecessors = {
            'api_fetch': 'data_source',
            'cache': 'api_fetch',
            'classifier': 'cache',
            'workers_hub': 'classifier',
            'worker_1': 'workers_hub',
            'worker_2': 'workers_hub',
            'worker_3': 'workers_hub',
            'streaming': ['worker_1', 'worker_2', 'worker_3'],
            'mappers': 'streaming',
            'dna_synth': 'mappers',
            'intelligence': 'dna_synth',
            'persistence': 'intelligence'
        };

        const predDef = predecessors[targetNodeId];
        if (!predDef) return;

        let predId = null;
        if (Array.isArray(predDef)) {
            predId = predDef.find(id => PipelineStateManager.nodeStats[id].isPendingHandover);
            if (!predId) predId = predDef.find(id => PipelineStateManager.nodeStats[id].count > 0);
            if (predId) PipelineStateManager.nodeStats[predId].isPendingHandover = false;
        } else {
            predId = predDef;
        }

        if (predId && PipelineStateManager.nodeStats[predId]) {
            spawnTravelingPackage(predId, targetNodeId);

            const predStats = PipelineStateManager.nodeStats[predId];
            if (predStats.count === 0 && PipelineStateManager.nodeStates[predId] === 'pending') {
                PipelineStateManager.nodeStates[predId] = 'idle';
                predStats.currentLabel = null;
                predStats.repo = null;
                predStats.file = null;
            }
            predStats.isPendingHandover = false;
        }
    }
};

export default PipelineEventHandler;
