/**
 * NodeManager.js
 * Manages the state, statistics, and health of pipeline nodes.
 * Handles nodeStates, nodeStats, and nodeHealth.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';

export class NodeManager {
    constructor() {
        this.nodeStates = {};
        this.nodeStats = {};
        this.nodeHealth = {};
    }

    /**
     * Initialize all node containers
     */
    init() {
        const bufferNodes = ['workers_hub', 'persistence', 'streaming'];

        Object.keys(PIPELINE_NODES).forEach(id => {
            this.nodeStates[id] = 'idle';
            this.nodeHealth[id] = true;
            this.nodeStats[id] = {
                count: 0,
                lastEvent: null,
                isBuffer: bufferNodes.includes(id),
                repo: null,
                file: null,
                isWaiting: false,
                isDispatching: false,
                isReceiving: false,
                isPendingHandover: false,
                currentLabel: null
            };
        });
    }

    /**
     * Atomic update for node health
     */
    updateHealth(fleetState) {
        if (!fleetState) return false;
        let changed = false;

        Object.keys(PIPELINE_NODES).forEach(nodeId => {
            const node = PIPELINE_NODES[nodeId];
            if (node.port && fleetState[node.port]) {
                const isOnline = fleetState[node.port].online;
                if (this.nodeHealth[nodeId] !== isOnline) {
                    this.nodeHealth[nodeId] = isOnline;
                    changed = true;
                }
            }
        });
        return changed;
    }

    /**
     * Get node state
     */
    getNodeState(nodeId) {
        return this.nodeStates[nodeId] || 'idle';
    }

    /**
     * Set node state
     */
    setNodeState(nodeId, state) {
        this.nodeStates[nodeId] = state;
    }

    /**
     * Get node stats
     */
    getNodeStats(nodeId) {
        return this.nodeStats[nodeId];
    }

    /**
     * Update node stats
     */
    updateNodeStats(nodeId, updates) {
        if (this.nodeStats[nodeId]) {
            Object.assign(this.nodeStats[nodeId], updates);
        }
    }

    /**
     * Get node health
     */
    getNodeHealth(nodeId) {
        return this.nodeHealth[nodeId] || false;
    }

    /**
     * Set node health
     */
    setNodeHealth(nodeId, health) {
        this.nodeHealth[nodeId] = health;
    }

    /**
     * Initialize dynamic node stats
     */
    initDynamicNodeStats(slotId, initialStats = {}) {
        this.nodeStats[slotId] = {
            count: 0,
            isBuffer: false,
            lastEvent: null,
            repo: null,
            file: null,
            currentLabel: null,
            isWaiting: false,
            isPendingHandover: false,
            isDynamic: true,
            ...initialStats
        };
        this.nodeStates[slotId] = 'active';
        this.nodeHealth[slotId] = true;
    }
}

export const nodeManager = new NodeManager();
