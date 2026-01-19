/**
 * PipelineStateManager.js
 * Manages the state, history, and statistics of pipeline nodes.
 * Centralizes data mutation to ensure consistency.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';

export const PipelineStateManager = {
    nodeStates: {},
    nodeStats: {},
    nodeHealth: {},
    nodeHistory: {},
    particles: [],
    travelingPackages: [],

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
            this.nodeHistory[id] = [];
        });

        this.particles = [];
        this.travelingPackages = [];
    },

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
    },

    /**
     * Track an operation in history
     */
    addHistoryEntry(nodeId, repo, file, done = false) {
        if (!this.nodeHistory[nodeId]) this.nodeHistory[nodeId] = [];

        const timestamp = new Date().toLocaleTimeString();
        this.nodeHistory[nodeId].unshift({
            time: timestamp,
            repo: repo,
            file: file,
            display: `${repo}: ${file}`,
            done: done
        });

        if (this.nodeHistory[nodeId].length > 40) {
            this.nodeHistory[nodeId].pop();
        }
    },

    /**
     * Mark an existing history entry as completed
     */
    markHistoryDone(nodeId, repo, file) {
        const entry = this.nodeHistory[nodeId]?.find(h => h.repo === repo && h.file === file && !h.done);
        if (entry) {
            entry.done = true;
            entry.timeEnd = new Date().toLocaleTimeString();
            return true;
        }
        return false;
    },

    /**
     * Clean particles that have finished their duration
     */
    cleanupParticles() {
        const now = Date.now();
        this.particles = this.particles.filter(p => (now - p.startTime) < p.duration);
    }
};

export default PipelineStateManager;
