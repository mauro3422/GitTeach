/**
 * PipelineStatusHandlers.js
 * Handles pipeline status transitions and heavy logic.
 */

import { PipelineStateManager } from './PipelineStateManager.js';
import { PIPELINE_CONFIG } from './pipelineConfig.js';
import { UI_COLORS } from './colors.js';

export const PipelineStatusHandlers = {
    handleStartStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file) {
        stats.isWaiting = false;

        // Define type based on node
        let type = 'METADATA';
        if (nodeId === 'auditor') type = 'RAW_FILE';
        if (nodeId === 'workers_hub') type = 'METADATA';
        if (nodeId.startsWith('worker_')) type = 'METADATA';
        if (nodeId === 'mixing_buffer') type = 'FRAGMENT';
        if (nodeId === 'dna_synth') type = 'INSIGHT';
        if (nodeId === 'intelligence') type = 'DNA_SIGNAL';
        if (nodeId === 'persistence') type = 'SECURE_STORE';

        this.handleHandover(nodeId, payload, spawnTravelingPackage, type, file);
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
        this.handleHandover(nodeId, payload, spawnTravelingPackage, 'METADATA', file);
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

    handleHandover(targetNodeId, payload, spawnTravelingPackage, type = 'METADATA', file = null) {
        const predecessors = {
            'api_fetch': 'data_source',
            'cache': 'api_fetch',
            'auditor': 'cache',
            'workers_hub': 'auditor',
            'worker_1': 'workers_hub',
            'worker_2': 'workers_hub',
            'worker_3': 'workers_hub',
            'mixing_buffer': ['worker_1', 'worker_2', 'worker_3', 'workers_hub'],
            'mappers': 'mixing_buffer',
            'dna_synth': 'mappers',
            'intelligence': 'dna_synth',
            'persistence': 'intelligence'
        };

        const predDef = predecessors[targetNodeId];
        if (!predDef) return;

        let predId = null;
        if (Array.isArray(predDef)) {
            // Priority 1: Pick a node that is explicitly pending handover
            predId = predDef.find(id => PipelineStateManager.nodeStats[id]?.isPendingHandover);

            // Priority 2: If none pending, pick one that HAS count but NOT is the hub (unless necessary)
            if (!predId) {
                // If the target is mixing_buffer, it might be a background file from the hub
                if (targetNodeId === 'mixing_buffer') {
                    // Look for workers first, then hub
                    predId = predDef.find(id => id.startsWith('worker_') && PipelineStateManager.nodeStats[id]?.count > 0);
                    if (!predId) predId = 'workers_hub';
                } else {
                    predId = predDef.find(id => PipelineStateManager.nodeStats[id]?.count > 0);
                }
            }

            if (predId && PipelineStateManager.nodeStats[predId]) {
                PipelineStateManager.nodeStats[predId].isPendingHandover = false;
            }
        } else {
            predId = predDef;
        }

        if (predId && PipelineStateManager.nodeStats[predId]) {
            spawnTravelingPackage(predId, targetNodeId, type, file);

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
