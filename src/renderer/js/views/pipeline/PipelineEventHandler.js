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

            // Phase C: Pulse data_source as visual entry point
            const dataSourceStats = PipelineStateManager.nodeStats['data_source'];
            dataSourceStats.count = (dataSourceStats.count || 0) + 1;
            dataSourceStats.currentLabel = entry.payload.repo;
            PipelineStateManager.nodeStates['data_source'] = 'active';
            spawnParticles('data_source', UI_COLORS.NEUTRAL_ACTIVE);
            spawnTravelingPackage('data_source', 'api_fetch');

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
                spawnTravelingPackage(slotId, 'auditor');
            }
            return { nodeId: slotId, status: 'extracting', isDynamic: true };
        },

        'repo:complete': function (entry, spawnParticles, spawnTravelingPackage) {
            PipelineStateManager.releaseRepoSlot(entry.payload.repo);
            return { nodeId: 'cache', status: 'complete', isDynamic: true };
        },

        'file:cache:hit': function (entry, spawnParticles, spawnTravelingPackage) {
            // Golden Ray: Bypass AI workers
            spawnTravelingPackage('workers_hub', 'mixing_buffer', UI_COLORS.GOLDEN_HIT || '#FFD700');
            return { nodeId: 'mixing_buffer', status: 'receiving' };
        },

        'hub:circuit:open': function (entry, spawnParticles, spawnTravelingPackage) {
            const stats = PipelineStateManager.nodeStats['workers_hub'];
            stats.status = 'paused';
            stats.currentLabel = '⚠️ CIRCUIT BREAKER OPEN';
            spawnParticles('workers_hub', UI_COLORS.RED);
            return { nodeId: 'workers_hub', status: 'paused' };
        },

        'hub:circuit:closed': function (entry, spawnParticles, spawnTravelingPackage) {
            const stats = PipelineStateManager.nodeStats['workers_hub'];
            stats.status = 'active';
            stats.currentLabel = 'Worker Hub';
            return { nodeId: 'workers_hub', status: 'idle' };
        },

        'pipeline:resurrection': function (entry, spawnParticles, spawnTravelingPackage) {
            // Emergency Lane
            spawnTravelingPackage('cache', 'mixing_buffer', UI_COLORS.AMBER || '#FFBF00');
            return { nodeId: 'mixing_buffer', status: 'receiving' };
        },

        'mixer:gate:locked': function (entry, spawnParticles, spawnTravelingPackage) {
            const stats = PipelineStateManager.nodeStats['mixing_buffer'];
            stats.isGateLocked = true;
            stats.sublabel = `🔒 Threshold: ${entry.payload.rich || 0}/5`;
            return { nodeId: 'mixing_buffer', status: 'waiting' };
        },

        'mixer:gate:unlocked': function (entry, spawnParticles, spawnTravelingPackage) {
            const stats = PipelineStateManager.nodeStats['mixing_buffer'];
            stats.isGateLocked = false;
            stats.sublabel = `🔓 Masa Crítica!`;
            spawnParticles('mixing_buffer', UI_COLORS.GREEN);
            return { nodeId: 'mixing_buffer', status: 'active' };
        },

        'dna:radar:update': function (entry, spawnParticles, spawnTravelingPackage) {
            // Pulse satellites
            ['radar_adopt', 'radar_trial', 'radar_assess', 'radar_hold'].forEach(id => {
                spawnParticles('intelligence', UI_COLORS.PURPLE_ACTIVE, id);
            });
            return { nodeId: 'intelligence', status: 'active' };
        },

        'system:reaction': function (entry, spawnParticles, spawnTravelingPackage) {
            spawnParticles('intelligence', UI_COLORS.CYAN || '#00FFFF');
            return { nodeId: 'intelligence', status: 'active' };
        },

        // ===== CPU SECTOR: 3 Parallel Mappers =====
        'mapper:start': function (entry, spawnParticles, spawnTravelingPackage) {
            const mapperType = entry.payload?.mapper; // architecture | habits | stack
            const nodeId = mapperType ? `mapper_${mapperType}` : 'mapper_habits';

            const stats = PipelineStateManager.nodeStats[nodeId];
            const states = PipelineStateManager.nodeStates;

            states[nodeId] = 'active';
            stats.count = (stats.count || 0) + 1;
            stats.status = 'processing';
            stats.currentLabel = `${mapperType?.toUpperCase() || 'MAPPER'}`;
            stats.startTime = Date.now();

            spawnParticles(nodeId, UI_COLORS.YELLOW_ACTIVE);
            spawnTravelingPackage('mixing_buffer', nodeId);

            return { nodeId, status: 'active' };
        },

        'mapper:end': function (entry, spawnParticles, spawnTravelingPackage) {
            const mapperType = entry.payload?.mapper;
            const nodeId = mapperType ? `mapper_${mapperType}` : 'mapper_habits';

            const stats = PipelineStateManager.nodeStats[nodeId];
            const states = PipelineStateManager.nodeStates;

            states[nodeId] = 'idle';
            stats.status = entry.payload?.success ? 'done' : 'error';
            stats.durationMs = stats.startTime ? Date.now() - stats.startTime : 0;
            stats.currentLabel = entry.payload?.success ? `✓ ${mapperType}` : `✗ ${mapperType}`;

            // Flow to DNA Synth
            spawnTravelingPackage(nodeId, 'dna_synth');

            return { nodeId, status: 'idle' };
        },

        // ===== Phase B: Embedding Server (port 8001) =====
        'embedding:start': function (entry, spawnParticles, spawnTravelingPackage) {
            const stats = PipelineStateManager.nodeStats['embedding_server'];
            const states = PipelineStateManager.nodeStates;

            states['embedding_server'] = 'active';
            stats.count = (stats.count || 0) + 1;
            stats.status = 'processing';
            stats.currentLabel = `Embedding...`;

            spawnParticles('embedding_server', UI_COLORS.PURPLE_ACTIVE);

            return { nodeId: 'embedding_server', status: 'active' };
        },

        'embedding:end': function (entry, spawnParticles, spawnTravelingPackage) {
            const stats = PipelineStateManager.nodeStats['embedding_server'];
            const states = PipelineStateManager.nodeStates;

            states['embedding_server'] = 'idle';
            stats.status = entry.payload?.success ? 'done' : 'error';
            stats.currentLabel = entry.payload?.success ? '✓ Embedded' : '✗ Failed';

            return { nodeId: 'embedding_server', status: 'idle' };
        }
    },

    handleEvent(entry, spawnParticles, spawnTravelingPackage) {
        const { type, payload } = entry;

        // Visual signaling: location ping
        const targetNodeId = PipelineEventHandler.getEventNodeId(entry);
        if (targetNodeId) {
            PipelineStateManager.addPulse(targetNodeId, PIPELINE_NODES[targetNodeId]?.activeColor || '#ffffff');
        }

        // Wrapped spawnTravelingPackage to include filename from payload automatically
        const smartSpawn = (from, to, fileOverride = null) => {
            const file = fileOverride || payload?.file || payload?.repo || null;
            spawnTravelingPackage(from, to, file);
        };

        // Check if we have a specific strategy for this event type
        const strategy = PipelineEventHandler.eventStrategies[type];
        if (strategy) {
            const nodeId = PipelineEventHandler.getEventNodeId(entry);
            if (nodeId) {
                PipelineStateManager.addPulse(nodeId, PIPELINE_NODES[nodeId]?.activeColor || '#ffffff');
            }
            return strategy(entry, spawnParticles, smartSpawn);
        }

        // Handle regular pipeline events
        const nodeId = PipelineEventHandler.getEventNodeId(entry);
        if (nodeId) {
            PipelineStateManager.addPulse(nodeId, PIPELINE_NODES[nodeId]?.activeColor || '#ffffff');
        }
        return PipelineEventHandler.handleRegularEvent(entry, spawnParticles, smartSpawn);
    },

    /**
     * Handle regular pipeline events (non-repo specific)
     */
    handleRegularEvent(entry, spawnParticles, spawnTravelingPackage) {
        const { type, payload } = entry;

        const nodeId = PipelineEventHandler.findNodeForEvent(type);
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
            'start': () => PipelineEventHandler.handleStartStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file),
            'waiting': () => PipelineEventHandler.handleWaitingStatus(stats, states, nodeId),
            'dispatching': () => PipelineEventHandler.handleDispatchingStatus(nodeId, stats, states, spawnParticles),
            'receiving': () => PipelineEventHandler.handleReceivingStatus(nodeId, stats, spawnParticles),
            'end': () => PipelineEventHandler.handleEndStatus(nodeId, stats, states, repo, file),
            'default': () => PipelineEventHandler.handleOneShotStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file)
        };

        const handler = statusStrategies[status] || statusStrategies['default'];
        const result = handler();

        stats.lastEvent = type;
        return { nodeId, status: result?.status || status };
    },

    handleStartStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file) {
        stats.isWaiting = false;
        this.handleHandover(nodeId, payload, spawnTravelingPackage, file);
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
        this.handleHandover(nodeId, payload, spawnTravelingPackage, file);
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
     * Maps an event entry to a specific node ID
     */
    getEventNodeId(entry) {
        const { type, payload } = entry;

        // 1. Special Routing: Mappers
        if (type === 'mapper:start' || type === 'mapper:end' || type.startsWith('mapper:')) {
            const mapperType = payload?.mapper;
            return mapperType ? `mapper_${mapperType}` : 'mapper_habits';
        }

        // 2. Special Routing: Worker Slots
        if (type.startsWith('worker:slot:')) {
            const slotNum = type.split(':').pop();
            return `worker_${slotNum}`;
        }

        // 3. Dynamic Repos (handled in simulation/start)
        if (type === 'repo:detected' || type === 'repo:tree:fetched' || type === 'repo:files:extracting') {
            return PipelineStateManager.getSlotForRepo ? PipelineStateManager.getSlotForRepo(payload.repo) : 'cache';
        }

        // 4. Default constant-based mapping
        return this.findNodeForEvent(type);
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
    handleHandover(targetNodeId, payload, spawnTravelingPackage, file = null) {
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
            spawnTravelingPackage(predId, targetNodeId, file);

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
