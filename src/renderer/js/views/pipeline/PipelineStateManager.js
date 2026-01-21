/**
 * PipelineStateManager.js
 * Orchestrates pipeline state management by delegating to specialized managers.
 * Maintains backward compatibility while applying SRP.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';
import { LayoutEngine } from './LayoutEngine.js';
import { nodeManager } from './NodeManager.js';
import { historyManager } from './HistoryManager.js';
import { dynamicSlotManager } from './DynamicSlotManager.js';
import { PipelineParticleManager } from './PipelineParticleManager.js';

export const PipelineStateManager = {
    // Delegate to specialized managers
    get nodeStates() { return nodeManager.nodeStates; },
    get nodeStats() { return nodeManager.nodeStats; },
    get nodeHealth() { return nodeManager.nodeHealth; },
    get nodeHistory() { return historyManager.nodeHistory; },

    // Delegate particle management to PipelineParticleManager
    get particles() { return PipelineParticleManager.getParticles(); },
    get travelingPackages() { return PipelineParticleManager.getTravelingPackages(); },
    get pulses() { return PipelineParticleManager.getPulses(); },

    /**
     * Initialize all node containers
     */
    init() {
        nodeManager.init();
        historyManager.init(Object.keys(PIPELINE_NODES));
        dynamicSlotManager.reset();
        PipelineParticleManager.init();
    },

    /**
     * Create a ripple pulse at a node to signal activity
     */
    addPulse(nodeId, color) {
        PipelineParticleManager.addPulse(nodeId, color);
    },

    /**
     * Spawn particles emanating from a node
     */
    addParticles(nodeId, color) {
        PipelineParticleManager.addParticles(nodeId, color);
    },

    /**
     * Spawn a traveling package between nodes
     */
    addTravelingPackage(fromId, toId, file = null, type = 'RAW_FILE') {
        PipelineParticleManager.addTravelingPackage(fromId, toId, file, type);
    },

    /**
     * Atomic update for node health
     */
    updateHealth(fleetState) {
        return nodeManager.updateHealth(fleetState);
    },

    /**
     * Track an operation in history
     */
    addHistoryEntry(nodeId, repo, file, done = false, slotId = null) {
        return historyManager.addHistoryEntry(nodeId, repo, file, done, slotId);
    },

    /**
     * Update the slotId for a file in classifier history when it gets assigned to a worker
     */
    updateHistorySlot(nodeId, repo, file, slotId) {
        return historyManager.updateHistorySlot(nodeId, repo, file, slotId);
    },

    /**
     * Mark an existing history entry as completed
     */
    markHistoryDone(nodeId, repo, file) {
        return historyManager.markHistoryDone(nodeId, repo, file);
    },

    // === MÉTODOS PARA REPOS DINÁMICOS (ILIMITADOS) ===

    /**
     * Crea o retorna el slot asignado a un repo.
     * NO HAY LÍMITE - cada repo tiene su propio nodo.
     */
    assignRepoToSlot(repoName) {
        const slotId = dynamicSlotManager.assignRepoToSlot(repoName);

        if (slotId) {
            // Initialize node structures for this dynamic slot
            nodeManager.initDynamicNodeStats(slotId, {
                count: 1,
                lastEvent: 'repo:detected',
                isBuffer: false,
                repo: repoName,
                file: null,
                isWaiting: false,
                isDispatching: false,
                isReceiving: false,
                isPendingHandover: false,
                currentLabel: repoName,
                isDynamic: true
            });
            historyManager.initDynamicNodeHistory(slotId);
        }

        return slotId;
    },

    updateRepoSlotState(repoName, updates) {
        const slotId = dynamicSlotManager.updateRepoSlotState(repoName, updates);

        // Update node stats label if filesCount changed
        if (updates.filesCount !== undefined && slotId && nodeManager.getNodeStats(slotId)) {
            nodeManager.updateNodeStats(slotId, {
                currentLabel: `${repoName} (${updates.filesCount})`
            });
        }

        return slotId;
    },

    getRepoSlotState(slotId) {
        return dynamicSlotManager.getRepoSlotState(slotId);
    },

    releaseRepoSlot(repoName) {
        dynamicSlotManager.releaseRepoSlot(repoName);

        const slotId = dynamicSlotManager.getSlotForRepo(repoName);
        if (slotId) {
            nodeManager.setNodeState(slotId, 'idle');
            nodeManager.updateNodeStats(slotId, { count: 0 });
        }
    },

    getDynamicSlots() {
        return dynamicSlotManager.getDynamicSlots();
    },

    /**
     * Retorna todos los slots activos para renderizado
     */
    getActiveRepoSlots() {
        return dynamicSlotManager.getActiveRepoSlots(nodeManager.nodeStates, nodeManager.nodeStats);
    },

    /**
     * Clean particles and pulses that have finished their duration
     */
    cleanupParticles() {
        PipelineParticleManager.cleanup();
    }
};

export default PipelineStateManager;
