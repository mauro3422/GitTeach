/**
 * TracerDOMCache.js
 * Responsabilidad única: Cachear y proveer referencias a elementos DOM
 */

export const TracerDOMCache = {
    els: {},

    /**
     * Cache all DOM elements used by TracerView
     */
    cache() {
        this.els = {
            // High-level containers
            debuggerSection: document.getElementById('debugger-section'),
            debuggerContainer: document.getElementById('debugger-container'),
            logStream: document.getElementById('log-stream'),

            // Centralized Controls (in Canvas Header)
            btnRun: document.getElementById('canvas-play'),
            btnStop: document.getElementById('canvas-stop'),
            btnStep: document.getElementById('canvas-step'),

            repoTargets: document.getElementById('cfg-max-repos'),
            cfgMaxFiles: document.getElementById('cfg-max-files'),

            // Progress & Status
            progressFill: document.getElementById('canvas-progress-fill'),
            progressText: document.getElementById('canvas-progress-text'),
            aiStatus: document.getElementById('ai-status'),
            sessionId: document.getElementById('session-id')
        };
    },

    /**
     * Re-cache elements (useful after dynamic DOM changes like PipelineCanvas init)
     */
    refresh() {
        this.cache();
    },

    /**
     * Get a cached element by key
     */
    get(key) {
        // Fallback for dynamic elements not yet in cache
        if (!this.els[key]) {
            const mappedId = this.getMapId(key);
            this.els[key] = document.getElementById(mappedId);
        }
        return this.els[key];
    },

    /**
     * Helper to map internal keys to DOM IDs
     */
    getMapId(key) {
        const maps = {
            btnRun: 'canvas-play',
            btnStop: 'canvas-stop',
            btnStep: 'canvas-step',
            repoTargets: 'cfg-max-repos',
            progressFill: 'canvas-progress-fill',
            progressText: 'canvas-progress-text'
        };
        return maps[key] || key;
    },

    /**
     * Get debugger-related elements
     */
    getDebugger() {
        return {
            section: this.get('debuggerSection'),
            container: this.get('debuggerContainer')
        };
    },

    /**
     * Helper for fleet containers
     */
    getFleet(port) {
        return document.getElementById(`canvas-fleet-${port}`);
    }
};
