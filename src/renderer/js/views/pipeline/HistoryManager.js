/**
 * HistoryManager.js
 * Manages the history tracking and logging for pipeline nodes.
 * Handles addHistoryEntry, updateHistorySlot, and markHistoryDone.
 */

import { PIPELINE_CONFIG } from './pipelineConfig.js';

export class HistoryManager {
    constructor() {
        this.nodeHistory = {};
    }

    /**
     * Initialize history for nodes
     */
    init(nodeIds) {
        nodeIds.forEach(id => {
            this.nodeHistory[id] = [];
        });
    }

    /**
     * Track an operation in history
     * @param {string} nodeId - Node ID
     * @param {string} repo - Repository name
     * @param {string} file - File path
     * @param {boolean} done - Whether the operation is complete
     * @param {string} slotId - For classifier, tracks which worker slot receives the file
     */
    addHistoryEntry(nodeId, repo, file, done = false, slotId = null) {
        if (!this.nodeHistory[nodeId]) this.nodeHistory[nodeId] = [];

        const timestamp = new Date().toLocaleTimeString();
        this.nodeHistory[nodeId].unshift({
            time: timestamp,
            repo: repo,
            file: file,
            display: `${repo}: ${file}`,
            done: done,
            slotId: slotId  // Track which slot receives this file
        });

        if (this.nodeHistory[nodeId].length > PIPELINE_CONFIG.HISTORY_LIMIT) {
            this.nodeHistory[nodeId].pop();
        }
    }

    /**
     * Update the slotId for a file in classifier history when it gets assigned to a worker
     * Uses fuzzy matching since repo names may vary (e.g., 'unknown' vs actual name)
     */
    updateHistorySlot(nodeId, repo, file, slotId) {
        if (!this.nodeHistory[nodeId]) return false;

        // Try exact match first
        let entry = this.nodeHistory[nodeId].find(h => h.repo === repo && h.file === file);

        // If not found, try matching by file path ending (more flexible)
        if (!entry && file) {
            const fileBasename = file.split('/').pop();
            entry = this.nodeHistory[nodeId].find(h =>
                h.file && (h.file === file || h.file.endsWith(fileBasename) || file.endsWith(h.file))
            );
        }

        if (entry) {
            entry.slotId = slotId;
            return true;
        }
        return false;
    }

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
    }

    /**
     * Get history for a specific node
     */
    getNodeHistory(nodeId) {
        return this.nodeHistory[nodeId] || [];
    }

    /**
     * Initialize history for a dynamic node
     */
    initDynamicNodeHistory(slotId) {
        this.nodeHistory[slotId] = [];
    }

    /**
     * Clear all history
     */
    clear() {
        Object.keys(this.nodeHistory).forEach(nodeId => {
            this.nodeHistory[nodeId] = [];
        });
    }
}

export const historyManager = new HistoryManager();
