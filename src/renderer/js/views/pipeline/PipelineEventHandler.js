/**
 * PipelineEventHandler.js
 * Handles pipeline events and visual state transitions.
 * Logic for handover and coordination between nodes.
 */

import { PIPELINE_NODES, EVENT_NODE_MAP } from './PipelineConstants.js';
import { PIPELINE_CONFIG } from './pipelineConfig.js';
import { UI_COLORS } from './colors.js';
import { PipelineStateManager } from './PipelineStateManager.js';
import { RepoEventStrategies } from './strategies/RepoEventStrategies.js';
import { WorkerEventStrategies } from './strategies/WorkerEventStrategies.js';
import { MapperEventStrategies } from './strategies/MapperEventStrategies.js';
import { SystemEventStrategies } from './strategies/SystemEventStrategies.js';
import { PipelineStatusHandlers } from './PipelineStatusHandlers.js';

export const PipelineEventHandler = {
    // Strategy pattern for event handling
    eventStrategies: {
        ...RepoEventStrategies,
        ...WorkerEventStrategies,
        ...MapperEventStrategies,
        ...SystemEventStrategies
    },

    handleEvent(entry, spawnParticles, spawnTravelingPackage) {
        const { type, payload } = entry;

        // Visual signaling: location ping
        const targetNodeId = PipelineEventHandler.getEventNodeId(entry);
        if (targetNodeId) {
            PipelineStateManager.addPulse(targetNodeId, PIPELINE_NODES[targetNodeId]?.activeColor || '#ffffff');
        }

        // Wrapped spawnTravelingPackage to include filename from payload automatically
        const smartSpawn = (from, to, type = 'RAW_FILE', fileOverride = null) => {
            const file = fileOverride || payload?.file || payload?.repo || null;
            spawnTravelingPackage(from, to, file, type);
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
            'start': () => PipelineStatusHandlers.handleStartStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file),
            'waiting': () => PipelineStatusHandlers.handleWaitingStatus(stats, states, nodeId),
            'dispatching': () => PipelineStatusHandlers.handleDispatchingStatus(nodeId, stats, states, spawnParticles),
            'receiving': () => PipelineStatusHandlers.handleReceivingStatus(nodeId, stats, spawnParticles),
            'end': () => PipelineStatusHandlers.handleEndStatus(nodeId, stats, states, repo, file),
            'default': () => PipelineStatusHandlers.handleOneShotStatus(nodeId, payload, spawnParticles, spawnTravelingPackage, stats, states, repo, file)
        };

        const handler = statusStrategies[status] || statusStrategies['default'];
        const result = handler();

        stats.lastEvent = type;
        return { nodeId, status: result?.status || status };
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

};

export default PipelineEventHandler;
