/**
 * FleetMonitor - Orchestrates the polling loop and timing for different ports.
 */
export class FleetMonitor {
    constructor(slotManager, fleetBroadcaster) {
        this.slotManager = slotManager;
        this.fleetBroadcaster = fleetBroadcaster;
        this.ports = [8000, 8001, 8002];
        this.intervalId = null;
        this.isPolling = false;
        this.lastPollTimes = {};
    }

    /**
     * Start the fleet monitoring loop
     */
    start() {
        if (this.isPolling) return;
        console.log(`[FleetMonitor] Starting fleet monitor (Relaxed polling: 3s for health check)...`);

        this.isPolling = true;
        this.runMonitoringLoop();
    }

    /**
     * Stop the fleet monitoring loop
     */
    stop() {
        this.isPolling = false;
        console.log('[FleetMonitor] Fleet monitor stopping.');
    }

    async runMonitoringLoop() {
        if (!this.isPolling) return;

        const now = Date.now();
        const promises = this.ports.map(async port => {
            const lastPoll = this.lastPollTimes[port] || 0;
            const threshold = 3000; // Relaxed polling to 3 seconds (health check only)

            if (now - lastPoll >= threshold) {
                this.lastPollTimes[port] = now;
                return this.slotManager.pollServer(port);
            }
            return null; // Skip this port for now
        });

        const results = await Promise.all(promises);

        let hasChanged = false;
        results.forEach((res, index) => {
            if (!res) return; // Port was skipped

            const port = this.ports[index];
            if (this.slotManager.updateSlotState(port, res)) {
                hasChanged = true;
            }
        });

        if (hasChanged) {
            this.fleetBroadcaster.broadcastFleetState();
        }

        // Clean any stale event tracking
        this.slotManager.cleanStaleEventTracking();

        // Schedule next check in 500ms (relaxed, only for cleanup and health)
        setTimeout(() => this.runMonitoringLoop(), 500);
    }

    getPorts() {
        return [...this.ports];
    }

    isMonitoring() {
        return this.isPolling;
    }
}
