// src/renderer/js/services/ai/FleetMonitor.js

/**
 * FleetMonitor - SOLID service for reacting to AI Server Fleet telemetry.
 * Responsibility: Maintain renderer-side state of the fleet and notify listeners.
 */
export class FleetMonitor {
    constructor() {
        this.state = {};
        this.listeners = new Set();
        this.unsubscribe = null;
    }

    /**
     * Initialize the monitor and subscribe to IPC updates
     */
    async init() {
        if (!window.fleetAPI) {
            console.error('[FleetMonitor] Critical: fleetAPI not available in window context.');
            return;
        }

        // 1. Get initial state
        this.state = await window.fleetAPI.getStatus();
        this.notify();

        // 2. Subscribe to real-time updates
        this.unsubscribe = window.fleetAPI.onStatusUpdate((newState) => {
            this.state = newState;
            this.notify();
        });

        console.log('[FleetMonitor] Initialized and subscribed to telemetry.');
    }

    /**
     * Request a manual refresh from the main process
     */
    async refresh() {
        if (!window.fleetAPI) return;
        this.state = await window.fleetAPI.refresh();
        this.notify();
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback 
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        // Immediate call with current state
        callback(this.state);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.state));
    }

    getState() {
        return this.state;
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.listeners.clear();
    }
}

// Singleton instance for the app
export const fleetMonitor = new FleetMonitor();
export default fleetMonitor;
