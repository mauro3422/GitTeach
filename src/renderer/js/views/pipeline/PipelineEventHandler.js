/**
 * PipelineEventHandler.js
 * Handles pipeline events and visual state transitions.
 * Logic for handover and coordination between nodes.
 */

import { PIPELINE_NODES, EVENT_NODE_MAP } from './PipelineConstants.js';
import { PIPELINE_CONFIG } from './pipelineConfig.js';
import { UI_COLORS } from './colors.js';
import { PipelineStateManager } from './PipelineStateManager.js';

export const PipelineEventHandler = {
    // Strategy pattern for event handling
    eventStrategies: {
        'repo:detected': function (entry, spawnParticles, spawnTravelingPackage) {
            const slotId = PipelineStateManager.assignRepoToSlot(entry.payload.repo);
            if (slotId) {
                PipelineEventHandler.handleDynamicRepoNode(slotId, entry.payload, 'detected');
            }
            return { nodeId: slotId, status: 'detected', isDynamic: true };
        },

        'repo:tree:fetched': function (entry, spawnParticles, spawnTravelingPackage) {
            const slotId = PipelineStateManager.updateRepoSlotState(entry.payload.repo, {
                filesCount: entry.payload.filesCount,
                status: 'fetched'
            });
            if (slotId) {
                PipelineEventHandler.handleDynamicRepoNode(slotId, entry.payload, 'fetched');
            }
            return { nodeId: slotId, status: 'fetched', isDynamic: true };
        },

        'repo:files:extracting': function (entry, spawnParticles, spawnTravelingPackage) {
            const slotId = PipelineStateManager.updateRepoSlotState(entry.payload.repo, {
                status: 'extracting'
            });
            if (slotId) {
                PipelineEventHandler.handleDynamicRepoNode(slotId, entry.payload, 'extracting');
                spawnTravelingPackage(slotId, 'classifier');
            }
            return { nodeId: slotId, status: 'extracting', isDynamic: true };
        },

        'repo:complete': function (entry, spawnParticles, spawnTravelingPackage) {
            PipelineStateManager.releaseRepoSlot(entry.payload.repo);
            return { nodeId: 'cache', status: 'complete', isDynamic: true };
        }
    },

    /**
     * Main event entry point - Simplified using Strategy Pattern
     */
    handleEvent(entry, spawnParticles, spawnTravelingPackage) {
        const { type, payload } = entry;

        // Check if we have a specific strategy for this event type
        const strategy = this.eventStrategies[type];
        if (strategy) {
            return strategy(entry, spawnParticles, spawnTravelingPackage);
        }

        // Handle regular pipeline events
        return this.handleRegularEvent(entry, spawnParticles, spawnTravelingPackage);
    },

    /**
     * Handle regular pipeline events (non-repo specific)
     */
    handleRegularEvent(entry, spawnParticles, spawnTravelingPackage) {
        const { type, payload } = entry;

        const nodeId = this.findNodeForEvent(type);
        if (!nodeId) return null;

        const status = payload?.status;
        const repo = payload?.repo || 'System';
        const file = payload?.file || (repo !== 'System' ? `[${repo}] Processing` : 'Task Processed');

        const stats = PipelineStateManager.nodeStats[nodeId];
        const states = PipelineStateManager.nodeStates;

        // Idempotency check
        const isRedundantStart = (status === 'start' &&
            stats.repo === repo &&
            stats.file === file &&
            states[nodeId] === 'active');

        if (isRedundantStart) return { nodeId, redundant: true };

        // Route to appropriate status handler
        const statusStrategies = {
            'start': () => this.handleStartStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file),
            'waiting': () => this.handleWaitingStatus(stats, states, nodeId),
            'dispatching': () => this.handleDispatchingStatus(nodeId, stats, states, spawnParticles),
            'receiving': () => this.handleReceivingStatus(nodeId, stats, spawnParticles),
            'end': () => this.handleEndStatus(nodeId, stats, states, repo, file),
            'default': () => this.handleOneShotStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file)
        };

        const handler = statusStrategies[status] || statusStrategies['default'];
        const result = handler();

        stats.lastEvent = type;
        return { nodeId, status: result?.status || status };
    },

    handleStartStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file) {
        stats.isWaiting = false;
        this.handleHandover(nodeId, payload, spawnTravelingPackage);
        states[nodeId] = 'active';
        stats.count++;

        if (nodeId.startsWith('worker_') && nodeId !== 'workers_hub') {
            stats.currentLabel = `${repo}/${file}`;
            stats.repo = repo;
            stats.file = file;
            PipelineStateManager.updateHistorySlot('workers_hub', repo, file, nodeId);
        }

        PipelineStateManager.addHistoryEntry(nodeId, repo, file, false);
    },

    handleWaitingStatus(stats, states, nodeId) {
        stats.isWaiting = true;
        states[nodeId] = 'idle';
    },

    handleDispatchingStatus(nodeId, stats, states, spawnParticles) {
        states[nodeId] = 'active';
        stats.isDispatching = true;
        spawnParticles(nodeId, UI_COLORS.DISPATCHING);

        setTimeout(() => {
            if (PipelineStateManager.nodeStats[nodeId]) {
                PipelineStateManager.nodeStats[nodeId].isDispatching = false;
            }
        }, PIPELINE_CONFIG.ANIMATION_DURATION);
    },

    handleReceivingStatus(nodeId, stats, spawnParticles) {
        stats.isDispatching = false;
        stats.isReceiving = true;
        spawnParticles(nodeId, UI_COLORS.RECEIVING);

        setTimeout(() => {
            if (PipelineStateManager.nodeStats[nodeId]) {
                PipelineStateManager.nodeStats[nodeId].isReceiving = false;
            }
        }, PIPELINE_CONFIG.ANIMATION_DURATION);
    },

    handleEndStatus(nodeId, stats, states, repo, file) {
        stats.isWaiting = false;
        stats.isDispatching = false;
        stats.isPendingHandover = true;
        stats.lastProcessedRepo = stats.repo;
        stats.lastProcessedFile = stats.file;
        states[nodeId] = 'pending';
        stats.count = Math.max(0, stats.count - 1);

        PipelineStateManager.markHistoryDone(nodeId, repo, file);
    },

    handleOneShotStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file) {
        stats.isWaiting = false;
        this.handleHandover(nodeId, payload, spawnTravelingPackage);
        states[nodeId] = 'active';
        stats.count++;

        const isSlot = nodeId.startsWith('worker_') && nodeId !== 'workers_hub';
        if (!stats.isBuffer && !isSlot) {
            setTimeout(() => {
                stats.count = Math.max(0, stats.count - 1);
                if (stats.count === 0) states[nodeId] = 'idle';
            }, PIPELINE_CONFIG.ONE_SHOT_DURATION);
        }

        PipelineStateManager.addHistoryEntry(nodeId, repo, file, true);
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
    },

    handleDynamicRepoNode(slotId, payload, status) {
        const stats = PipelineStateManager.nodeStats[slotId];
        const states = PipelineStateManager.nodeStates;

        if (!stats) {
            // Inicializar stats para el slot dinámico
            PipelineStateManager.nodeStats[slotId] = {
                count: 0, isBuffer: false, lastEvent: null,
                repo: null, file: null, currentLabel: null,
                isWaiting: false, isPendingHandover: false,
                isDynamic: true
            };
        }

        const slotStats = PipelineStateManager.nodeStats[slotId];
        slotStats.repo = payload.repo;
        slotStats.currentLabel = payload.repo;

        switch (status) {
            case 'detected':
                states[slotId] = 'active';
                slotStats.count = 1;
                break;
            case 'fetched':
                slotStats.currentLabel = `${payload.repo} (${payload.filesCount} files)`;
                break;
            case 'extracting':
                states[slotId] = 'pending';
                break;
        }
    }
};

export default PipelineEventHandler;
