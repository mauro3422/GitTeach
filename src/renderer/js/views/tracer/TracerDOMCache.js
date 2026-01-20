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
            btnRun: document.getElementById('btn-run-tracer'),
            repoTargets: document.getElementById('repo-targets'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            queueText: document.getElementById('queue-text'),
            aiStatus: document.getElementById('ai-status'),
            logStream: document.getElementById('log-stream'),
            sessionId: document.getElementById('session-id'),
            fleet: {
                8000: document.getElementById('fleet-8000'),
                8001: document.getElementById('fleet-8001'),
                8002: document.getElementById('fleet-8002')
            },
            // Debugger elements
            debuggerSection: document.getElementById('debugger-section'),
            debuggerContainer: document.getElementById('debugger-container'),
            btnToggleDebugger: document.getElementById('btn-toggle-debugger')
        };
    },

    /**
     * Get a cached element by key
     */
    get(key) {
        return this.els[key];
    },

    /**
     * Get fleet container for specific port
     */
    getFleet(port) {
        return this.els.fleet[port];
    },

    /**
     * Get debugger-related elements
     */
    getDebugger() {
        return {
            section: this.els.debuggerSection,
            container: this.els.debuggerContainer,
            button: this.els.btnToggleDebugger
        };
    }
};
